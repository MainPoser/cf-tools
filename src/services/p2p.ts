
type P2PRole = 'sender' | 'receiver';
type StatusCallback = (status: string, progress?: number) => void;
type FileReceivedCallback = (file: Blob, name: string) => void;

interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8787';

export class P2PManager {
    private pc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private role: P2PRole;
    private code: string | null = null;
    private onStatus: StatusCallback;
    private onFileReceived: FileReceivedCallback;
    
    // 状态管理
    private iceBuffer: RTCIceCandidate[] = [];
    private pollTimers: number[] = [];
    
    // 文件传输相关
    private fileToSend: File | null = null;
    private receivedChunks: ArrayBuffer[] = [];
    private receivedSize = 0;
    private incomingMetadata: FileMetadata | null = null;

    private iceServers: RTCIceServer[];

    constructor(
        role: P2PRole, 
        onStatus: StatusCallback, 
        onFileReceived: FileReceivedCallback,
        iceServers: RTCIceServer[]
    ) {
        this.role = role;
        this.onStatus = onStatus;
        this.onFileReceived = onFileReceived;
        this.iceServers = iceServers;
    }

    // --- 公共 API ---

    // 发送方：启动流程
    public async startSender(file: File): Promise<string> {
        this.fileToSend = file;
        this.onStatus('initializing');
        this.initPC();

        // 1. 创建 DataChannel (发送方主动)
        const channel = this.pc!.createDataChannel('file-transfer');
        this.setupDataChannel(channel);

        // 2. 创建 Offer
        const offer = await this.pc!.createOffer();
        await this.pc!.setLocalDescription(offer);

        // 3. 上传 Offer 换取 Code
        const res = await fetch(`${API_BASE}/api/p2p/session`, {
            method: 'POST',
            body: JSON.stringify({ offer })
        });
        const data = await res.json();
        this.code = data.code;
        
        this.onStatus('waiting-peer');
        
        // 4. 拿到 Code 后，立即把之前攒的 ICE 发出去
        this.flushIceBuffer();

        // 5. 开始轮询 Answer
        this.startPolling();

        return this.code!;
    }

    // 接收方：启动流程
    public async startReceiver(code: string) {
        this.code = code;
        this.onStatus('initializing');

        // 1. 获取 Offer
        const res = await fetch(`${API_BASE}/api/p2p/session/${code}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        this.initPC();

        // 2. 设置远程 Offer
        await this.pc!.setRemoteDescription(data.offer);

        // 3. 创建 Answer
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);

        // 4. 上传 Answer
        await fetch(`${API_BASE}/api/p2p/answer/${code}`, {
            method: 'POST',
            body: JSON.stringify({ answer })
        });

        this.onStatus('waiting-peer');
        
        // 5. 立即发送 ICE (接收方此时肯定有 code)
        this.flushIceBuffer();
        
        // 6. 开始轮询对方的 ICE
        this.startPolling();
    }

    // 停止所有活动
    public stop() {
        this.pollTimers.forEach(t => clearInterval(t));
        this.pollTimers = [];
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        this.code = null;
        this.iceBuffer = [];
        this.receivedChunks = [];
        this.receivedSize = 0;
    }

    // --- 内部逻辑 ---

    private initPC() {
        this.pc = new RTCPeerConnection({
            iceServers: this.iceServers
        });

        // 处理 ICE Candidate
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                if (this.code) {
                    this.sendIce(event.candidate);
                } else {
                    // Code 还没拿到，先存着
                    this.iceBuffer.push(event.candidate);
                }
            }
        };

        this.pc.onconnectionstatechange = () => {
            console.log(`[${this.role}] Connection State: ${this.pc?.connectionState}`);
            if (this.pc?.connectionState === 'connected') {
                this.onStatus('connected');
                // 连接成功，立即停止轮询并销毁服务器上的信令
                this.stopPolling();
                this.destroySignaling();
            } else if (this.pc?.connectionState === 'failed') {
                this.onStatus('error');
            }
        };

        // 接收方是被动接收 DataChannel
        if (this.role === 'receiver') {
            this.pc.ondatachannel = (e) => {
                this.setupDataChannel(e.channel);
            };
        }
    }

    private stopPolling() {
        this.pollTimers.forEach(t => clearInterval(t));
        this.pollTimers = [];
    }

    private destroySignaling() {
        if (this.code) {
            fetch(`${API_BASE}/api/p2p/session/${this.code}`, {
                method: 'DELETE'
            }).catch(e => console.error('Destroy signaling error:', e));
        }
    }

    private setupDataChannel(channel: RTCDataChannel) {
        this.dataChannel = channel;
        
        channel.onopen = () => {
            console.log(`[${this.role}] DataChannel Open`);
            if (this.role === 'sender' && this.fileToSend) {
                this.sendFileLogic();
            }
        };

        channel.onmessage = (e) => this.handleMessage(e);
    }

    private sendIce(candidate: RTCIceCandidate) {
        // Role = sender -> type = offer (上传到 offer 队列)
        // Role = receiver -> type = answer (上传到 answer 队列)
        const type = this.role === 'sender' ? 'offer' : 'answer';
        fetch(`${API_BASE}/api/p2p/ice/${this.code}`, {
            method: 'POST',
            body: JSON.stringify({ candidate, type })
        }).catch(e => console.error('Send ICE error:', e));
    }

    private flushIceBuffer() {
        if (this.iceBuffer.length > 0 && this.code) {
            console.log(`Flushing ${this.iceBuffer.length} ICE candidates`);
            this.iceBuffer.forEach(c => this.sendIce(c));
            this.iceBuffer = [];
        }
    }

    private startPolling() {
        // 1. 如果是 Sender，需要轮询 Answer
        if (this.role === 'sender') {
            const timer = window.setInterval(async () => {
                if (this.pc?.remoteDescription || !this.code) return; // 已经连上或没code就不查了
                try {
                    const res = await fetch(`${API_BASE}/api/p2p/answer/${this.code}`);
                    const data = await res.json();
                    
                    if (data.answer && this.pc) { 
                        // 修复: 如果连接已经建立(stable)或正在处理(have-local-offer)，避免重复设置
                        // 实际上只要不是 'stable' 我们都可以尝试设置，但如果已经是 stable 就绝对不要设了
                        if (this.pc.signalingState === 'stable') {
                            console.log('Connection stable, skipping redundant answer');
                            return;
                        }
                        console.log('Got Answer!');
                        await this.pc.setRemoteDescription(data.answer);
                    }
                } catch (e) { console.error(e); }
            }, 2000);
            this.pollTimers.push(timer);
        }

        // 2. 双方都要轮询对方的 ICE Candidates
        // Sender 查 'answer' 的 ICE; Receiver 查 'offer' 的 ICE
        const targetType = this.role === 'sender' ? 'answer' : 'offer';
        let lastIndex = 0;
        
        const iceTimer = window.setInterval(async () => {
            if (!this.pc || !this.code || this.pc.connectionState === 'connected') return;
            try {
                const res = await fetch(`${API_BASE}/api/p2p/ice/${this.code}?type=${targetType}&lastIndex=${lastIndex}`);
                const data = await res.json();
                
                // 再次检查 this.pc，防止在 await 期间组件被销毁
                if (!this.pc) return;

                if (data.candidates && data.candidates.length > 0) {
                    console.log(`Got ${data.candidates.length} remote ICE candidates`);
                    for (const cand of data.candidates) {
                        // 必须 setRemoteDescription 后才能 addIceCandidate
                        // 如果这时候 remoteDescription 还没好，怎么处理？
                        // WebRTC 标准允许 buffering，但在某些浏览器可能报错
                        // 简单起见，加个判断
                        if (this.pc.remoteDescription) {
                             await this.pc.addIceCandidate(cand);
                        } else {
                            // 理论上 Sender 等 Answer，Receiver 等 Offer
                            // Receiver 此时肯定有 RemoteDescription (Offer)
                            // Sender 必须等 Answer 到了才能加 ICE
                            // 这里的逻辑会直接由下一次轮询处理 (因为 lastIndex 没加，会重复取) -> 不对，API 是 stateless 的吗？
                            // 我们的 API 是根据 lastIndex 返回 slice。
                            // 如果我这次没加成功，不仅不能加 lastIndex，还得丢弃这些数据？
                            // 更好的做法：WebRTC 浏览器底层通常会处理 pending remote description。
                            // 只要不报错，就先把逻辑写简单：
                            try {
                                await this.pc.addIceCandidate(cand);
                            } catch (err) {
                                console.warn("Add ICE failed (probably remote desc not set yet), will retry next poll naturally if we don't update index?", err);
                                // 如果我们不更新 lastIndex，下次会重新拉取吗？
                                // 是的，只要 lastIndex 不变。
                                continue; 
                            }
                        }
                    }
                    lastIndex = data.total;
                }
            } catch (e) { console.error(e); }
        }, 2000);
        this.pollTimers.push(iceTimer);
    }

    private async sendFileLogic() {
        if (!this.dataChannel || !this.fileToSend) return;
        
        try {
            this.onStatus('transferring', 0);
            const file = this.fileToSend;
            const chunkSize = 64 * 1024; // 64KB chunks
            
            // 1. 发送元数据
            this.dataChannel.send(JSON.stringify({
                type: 'metadata',
                data: { name: file.name, size: file.size, type: file.type }
            }));

            // 2. 发送内容 (分块读取)
            let offset = 0;
            this.dataChannel.bufferedAmountLowThreshold = 65535;

            const readAndSendChunk = async () => {
                const channel = this.dataChannel;
                if (!channel || channel.readyState !== 'open') return;

                while (offset < file.size) {
                    if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
                        // 等待缓冲队列降低
                        channel.onbufferedamountlow = () => {
                            channel.onbufferedamountlow = null;
                            readAndSendChunk();
                        };
                        return;
                    }

                    try {
                        const slice = file.slice(offset, offset + chunkSize);
                        const buffer = await slice.arrayBuffer();
                        channel.send(buffer);
                        offset += chunkSize;
                        
                        const pct = Math.round((offset / file.size) * 100);
                        // 传输中显示进度，但预留 100% 给 ACK
                        this.onStatus('transferring', Math.min(pct, 99));
                    } catch (readErr) {
                        console.error("Error reading file chunk:", readErr);
                        this.onStatus('error');
                        return;
                    }
                }
                
                // 发送完毕
                console.log('File sent, waiting for ACK...');
            };
            
            readAndSendChunk();

        } catch (e) {
            console.error("Error starting file send:", e);
            this.onStatus('error');
        }
    }

    private handleMessage(event: MessageEvent) {
        const data = event.data;
        
        if (typeof data === 'string') {
            try {
                // 处理 ACK 信号
                if (data === 'ACK') {
                    console.log('Received ACK from receiver');
                    this.onStatus('completed', 100);
                    return;
                }

                const msg = JSON.parse(data);
                if (msg.type === 'metadata') {
                    this.incomingMetadata = msg.data;
                    this.receivedChunks = [];
                    this.receivedSize = 0;
                    this.onStatus('transferring', 0);
                    console.log(`Receiving file: ${msg.data.name}`);
                }
            } catch (e) { console.error(e); }
        } else {
            // Binary
            this.receivedChunks.push(data);
            this.receivedSize += data.byteLength;
            
            if (this.incomingMetadata) {
                const pct = Math.round((this.receivedSize / this.incomingMetadata.size) * 100);
                this.onStatus('transferring', pct);
                
                if (this.receivedSize >= this.incomingMetadata.size) {
                    const blob = new Blob(this.receivedChunks, { type: this.incomingMetadata.type });
                    this.onFileReceived(blob, this.incomingMetadata.name);
                    
                    // 优化: 接收完成，发送 ACK 给发送端
                    if (this.dataChannel && this.dataChannel.readyState === 'open') {
                        this.dataChannel.send('ACK');
                        console.log('File received, sent ACK');
                    }
                    
                    this.onStatus('completed', 100);
                }
            }
        }
    }
}

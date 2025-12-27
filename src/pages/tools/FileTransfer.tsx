import React, { useState, useRef, useEffect } from 'react';
import './FileTransfer.css';

type TransferState = 'idle' | 'initializing' | 'waiting-peer' | 'connected' | 'transferring' | 'completed' | 'error';

interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8787';

const FileTransfer: React.FC = () => {
  const [role, setRole] = useState<'sender' | 'receiver'>('sender');
  const [status, setStatus] = useState<TransferState>('idle');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [transferCode, setTransferCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const fileChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef<number>(0);
  const metadataRef = useRef<FileMetadata | null>(null);

    // 关键修复: 使用 ref 来存储 code，确保在异步回调中能获取到最新值
    const codeRef = useRef<string>('');
    // 关键修复: 缓存 ICE Candidates，防止在拿到 code 之前丢失候选者
    const candidateBufferRef = useRef<RTCIceCandidate[]>([]);
    
    // 关键修复: 存储定时器 ID 以便在组件卸载时清除
    const answerPollRef = useRef<number | null>(null);
    const candidatesPollRef = useRef<number | null>(null);
  
    // 组件卸载时清理所有定时器和连接
    useEffect(() => {
      return () => {
        if (answerPollRef.current) clearInterval(answerPollRef.current);
        if (candidatesPollRef.current) clearInterval(candidatesPollRef.current);
        if (pcRef.current) pcRef.current.close();
      };
    }, []);
    
    const sendIceCandidate = (code: string, candidate: RTCIceCandidate) => {
      fetch(`${API_BASE}/api/p2p/ice/${code}`, {
        method: 'POST',
        body: JSON.stringify({
          candidate: candidate,
          type: role === 'sender' ? 'offer' : 'answer'
        })
      }).catch(console.error);
    };
  
    const flushCandidates = (code: string) => {
      if (candidateBufferRef.current.length > 0) {
        console.log(`Flushing ${candidateBufferRef.current.length} buffered candidates`);
        candidateBufferRef.current.forEach(cand => sendIceCandidate(code, cand));
        candidateBufferRef.current = [];
      }
    };
  
    // 初始化 PeerConnection
    const initPC = () => {
      if (pcRef.current) pcRef.current.close();
      candidateBufferRef.current = []; // 重置 buffer
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });
  
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
  
        const currentCode = codeRef.current;
        if (currentCode) {
          // 有 code，直接发
          sendIceCandidate(currentCode, event.candidate);
        } else {
          // 没 code，存起来
          console.log('Buffering candidate...');
          candidateBufferRef.current.push(event.candidate);
        }
      };
  
      pc.onconnectionstatechange = () => {      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus('connected');
        setStatusMsg('已连接到对方，准备传输...');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('error');
        setStatusMsg('连接断开或失败');
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // --- 发送端逻辑 ---

  const startSender = async () => {
    if (!file) return;
    setStatus('initializing');
    setStatusMsg('正在创建连接...');

    // 重置状态
    codeRef.current = '';
    setTransferCode('');

    const pc = initPC();

    // 创建 Data Channel
    const channel = pc.createDataChannel('file-transfer');
    setupDataChannel(channel);

    // 创建 Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 上传 Offer 获取 Code
    try {
      const res = await fetch(`${API_BASE}/api/p2p/session`, {
        method: 'POST',
        body: JSON.stringify({ offer })
      });
      const data = await res.json();

      // 更新 code
      setTransferCode(data.code);
      codeRef.current = data.code; // 关键: 立即更新 ref
      
      // 立即发送缓存的 Candidates
      flushCandidates(data.code);

      setStatus('waiting-peer');
      setStatusMsg(`等待对方连接... 取件码: ${data.code}`);

      // 开始轮询 Answer
      pollForAnswer(data.code);
      // 开始轮询对方的 ICE candidates
      pollForCandidates(data.code, 'answer');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMsg('无法连接到信令服务器');
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.onopen = () => {
      if (role === 'sender') {
        sendFile();
      }
    };
    channel.onmessage = handleMessage;
  };

  const sendFile = async () => {
    if (!file || !dataChannelRef.current) return;
    setStatus('transferring');
    setStatusMsg('正在发送元数据...');

    const channel = dataChannelRef.current;

    // 1. 发送元数据
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type
    };
    channel.send(JSON.stringify({ type: 'metadata', data: metadata }));

    // 2. 发送文件内容 (分块)
    const chunkSize = 16 * 1024; // 16KB
    const buffer = await file.arrayBuffer();
    let offset = 0;

    setStatusMsg('正在发送文件内容...');

    // 使用 bufferedAmountLowThreshold 来控制背压
    channel.bufferedAmountLowThreshold = 65535;

    const sendChunk = () => {
      while (offset < buffer.byteLength) {
        if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
          // 缓冲区满，等待
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            sendChunk();
          };
          return;
        }

        const chunk = buffer.slice(offset, offset + chunkSize);
        channel.send(chunk);
        offset += chunkSize;

        // 更新进度
        setProgress(Math.min(100, Math.round((offset / buffer.byteLength) * 100)));
      }

      if (offset >= buffer.byteLength) {
        setStatus('completed');
        setStatusMsg('发送完成！');
      }
    };

    sendChunk();
  };

  const pollForAnswer = (code: string) => {
    // 清除旧的轮询（如果有）
    if (answerPollRef.current) clearInterval(answerPollRef.current);

    answerPollRef.current = window.setInterval(async () => {
      if (pcRef.current?.remoteDescription) {
        if (answerPollRef.current) clearInterval(answerPollRef.current);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/p2p/answer/${code}`);
        const data = await res.json();
        if (data.answer) {
          await pcRef.current?.setRemoteDescription(data.answer);
          if (answerPollRef.current) clearInterval(answerPollRef.current);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 2000);
  };

  // --- 接收端逻辑 ---

  const startReceiver = async () => {
    if (!inputCode) return;
    setStatus('initializing');
    setStatusMsg('正在获取连接信息...');

    setTransferCode(inputCode);
    codeRef.current = inputCode; // 更新 ref
    
    // 即使这里 code 已经有了，flush 也可以处理可能的边缘情况，或者简单的作为初始化
    flushCandidates(inputCode);

    try {
      const res = await fetch(`${API_BASE}/api/p2p/session/${inputCode}`);
      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setStatusMsg('取件码无效或已过期');
        return;
      }

      const pc = initPC();

      // 接收端监听 DataChannel
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 发送 Answer
      await fetch(`${API_BASE}/api/p2p/answer/${inputCode}`, {
        method: 'POST',
        body: JSON.stringify({ answer })
      });

      setStatus('waiting-peer');
      setStatusMsg('正在建立 P2P 连接...');

      // 开始轮询对方的 ICE candidates
      pollForCandidates(inputCode, 'offer');

    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMsg('连接失败');
    }
  };

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'metadata') {
          metadataRef.current = msg.data;
          fileChunksRef.current = [];
          receivedSizeRef.current = 0;
          setStatus('transferring');
          setStatusMsg(`正在接收: ${msg.data.name}`);
        }
      } catch (e) { console.error('JSON parse error', e); }
    } else {
      // Binary data (ArrayBuffer)
      fileChunksRef.current.push(data);
      receivedSizeRef.current += data.byteLength;

      if (metadataRef.current) {
        const pct = Math.round((receivedSizeRef.current / metadataRef.current.size) * 100);
        setProgress(pct);

        if (receivedSizeRef.current >= metadataRef.current.size) {
          saveFile();
        }
      }
    }
  };

  const saveFile = () => {
    if (!metadataRef.current) return;
    const blob = new Blob(fileChunksRef.current, { type: metadataRef.current.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadataRef.current.name;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('completed');
    setStatusMsg('接收完成！');
  };

  // --- 通用 ---

  const pollForCandidates = (code: string, targetType: 'offer' | 'answer') => {
    // 清除旧的轮询
    if (candidatesPollRef.current) clearInterval(candidatesPollRef.current);

    let lastIndex = 0;
    candidatesPollRef.current = window.setInterval(async () => {
      if (pcRef.current?.connectionState === 'connected' || pcRef.current?.connectionState === 'closed') {
        if (candidatesPollRef.current) clearInterval(candidatesPollRef.current);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/p2p/ice/${code}?type=${targetType}&lastIndex=${lastIndex}`);
        const data = await res.json();
        if (data.candidates && data.candidates.length > 0) {
          for (const cand of data.candidates) {
            await pcRef.current?.addIceCandidate(cand);
          }
          // 修正: API 设计是返回 slice(lastIndex), 同时返回总数 total
          // 所以下一次的 start index 应该是当前的 total
          lastIndex = data.total;
        }
      } catch (e) { /* ignore */ }
    }, 2000);
  };

  return (
    <div className="file-transfer-container">
      <h2>P2P 文件直传</h2>
      <p className="description">
        使用 WebRTC 技术，文件直接在设备间传输，不消耗服务器流量。
        <br />数据只在你们两端传输，安全且快速。
      </p>

      <div className="ft-tabs">
        <button
          className={role === 'sender' ? 'active' : ''}
          onClick={() => { setRole('sender'); setStatus('idle'); setProgress(0); }}
        >
          我要发送
        </button>
        <button
          className={role === 'receiver' ? 'active' : ''}
          onClick={() => { setRole('receiver'); setStatus('idle'); setProgress(0); }}
        >
          我要接收
        </button>
      </div>

      <div className="ft-content">
        {role === 'sender' ? (
          <div className="sender-panel">
            <div className="file-input-wrapper">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={status !== 'idle'} />
            </div>

            {file && status === 'idle' && (
              <button className="primary-btn" onClick={startSender}>生成取件码</button>
            )}

            {transferCode && (
              <div className="code-display">
                <p>取件码</p>
                <div className="code">{transferCode}</div>
                <p className="hint">请将此码告诉接收方 (1小时内有效)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="receiver-panel">
            <input
              type="text"
              placeholder="请输入6位取件码"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              disabled={status !== 'idle'}
              maxLength={6}
            />
            {status === 'idle' && (
              <button className="primary-btn" onClick={startReceiver}>开始下载</button>
            )}
          </div>
        )}

        {status !== 'idle' && (
          <div className={`status-box ${status}`}>
            <p className="status-text">{statusMsg}</p>
            {(status === 'transferring' || status === 'completed') && (
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTransfer;
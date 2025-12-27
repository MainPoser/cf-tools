import React, { useState, useEffect, useRef } from 'react';
import { P2PManager } from '../../services/p2p';
import './FileTransfer.css';

type ViewMode = 'sender' | 'receiver';

const FileTransfer: React.FC = () => {
  const [role, setRole] = useState<ViewMode>('sender');
  const [status, setStatus] = useState<string>('idle'); // idle, initializing, waiting-peer, connected, transferring, completed, error
  const [progress, setProgress] = useState<number>(0);
  const [code, setCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  // 使用 ref 持有 Manager 实例
  const managerRef = useRef<P2PManager | null>(null);

  // 状态显示文本映射
  const statusText: Record<string, string> = {
    'initializing': '正在初始化...',
    'waiting-peer': '等待对方连接...',
    'connected': '已连接，准备传输',
    'transferring': '正在传输...',
    'completed': '传输完成！',
    'error': '连接发生错误',
  };

  // 切换角色时清理旧实例
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [role]);

  const stopSession = () => {
    if (managerRef.current) {
      managerRef.current.stop();
      managerRef.current = null;
    }
    setStatus('idle');
    setProgress(0);
    setCode('');
  };

  const initManager = () => {
    stopSession();
    
    managerRef.current = new P2PManager(
      role,
      (newStatus, newProgress) => {
        setStatus(newStatus);
        if (newProgress !== undefined) setProgress(newProgress);
      },
      (blob, name) => {
        // 自动下载文件
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
    );
  };

  const handleStartSender = async () => {
    if (!file) return;
    initManager();
    try {
      const generatedCode = await managerRef.current!.startSender(file);
      setCode(generatedCode);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleStartReceiver = async () => {
    if (!inputCode || inputCode.length !== 6) return;
    initManager();
    try {
      await managerRef.current!.startReceiver(inputCode);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="file-transfer-container">
      <h2>P2P 文件直传</h2>
      <p className="description">
        使用 WebRTC 技术，文件直接在设备间传输，不消耗服务器流量。
        <br/>数据只在你们两端传输，安全且快速。
      </p>

      <div className="ft-tabs">
        <button 
          className={role === 'sender' ? 'active' : ''} 
          onClick={() => { setRole('sender'); setFile(null); stopSession(); }}
        >
          我要发送
        </button>
        <button 
          className={role === 'receiver' ? 'active' : ''} 
          onClick={() => { setRole('receiver'); setInputCode(''); stopSession(); }}
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
              <button className="primary-btn" onClick={handleStartSender}>生成取件码</button>
            )}

            {code && (
              <div className="code-display">
                <p>取件码</p>
                <div className="code">{code}</div>
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
              <button className="primary-btn" onClick={handleStartReceiver}>开始下载</button>
            )}
          </div>
        )}

        {status !== 'idle' && (
          <div className={`status-box ${status}`}>
            <p className="status-text">{statusText[status] || status}</p>
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

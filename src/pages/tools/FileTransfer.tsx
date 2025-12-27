import React, { useState, useEffect, useRef } from 'react';
import { P2PManager } from '../../services/p2p';
import { SettingOutlined, DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import './FileTransfer.css';

type ViewMode = 'sender' | 'receiver';

const DEFAULT_ICE_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:global.stun.twilio.com:3478'
];

const FileTransfer: React.FC = () => {
  const [role, setRole] = useState<ViewMode>('sender');
  const [status, setStatus] = useState<string>('idle'); 
  const [progress, setProgress] = useState<number>(0);
  const [code, setCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [stunServers, setStunServers] = useState<string[]>(() => {
    const saved = localStorage.getItem('p2p_stun_servers');
    return saved ? JSON.parse(saved) : DEFAULT_ICE_SERVERS;
  });
  const [newStun, setNewStun] = useState('');

  const managerRef = useRef<P2PManager | null>(null);

  const statusText: Record<string, string> = {
    'initializing': '正在初始化...',
    'waiting-peer': '等待对方连接...',
    'connected': '已连接，准备传输',
    'transferring': '正在传输...',
    'completed': '传输完成！',
    'error': '连接发生错误',
  };

  useEffect(() => {
    return () => stopSession();
  }, [role]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('p2p_stun_servers', JSON.stringify(stunServers));
  }, [stunServers]);

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
    
    // Convert string[] to RTCIceServer[]
    const iceConfig = stunServers.map(url => ({ urls: url }));

    managerRef.current = new P2PManager(
      role,
      (newStatus, newProgress) => {
        setStatus(newStatus);
        if (newProgress !== undefined) setProgress(newProgress);
      },
      (blob, name) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      iceConfig // Pass custom config
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

  // Settings Handlers
  const addServer = () => {
    if (newStun && !stunServers.includes(newStun)) {
      setStunServers([...stunServers, newStun]);
      setNewStun('');
    }
  };

  const removeServer = (index: number) => {
    const newList = [...stunServers];
    newList.splice(index, 1);
    setStunServers(newList);
  };

  const resetServers = () => {
    setStunServers(DEFAULT_ICE_SERVERS);
  };

  return (
    <div className="file-transfer-container">
      <div className="ft-header">
        <h2>P2P 文件直传</h2>
        <button 
          className={`settings-toggle ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="连接设置"
        >
          <SettingOutlined />
        </button>
      </div>
      
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-title">
            <span>STUN 服务器列表</span>
            <button className="text-btn" onClick={resetServers} title="恢复默认">
              <UndoOutlined /> 恢复
            </button>
          </div>
          <div className="server-list">
            {stunServers.map((url, idx) => (
              <div key={idx} className="server-item">
                <span className="server-url" title={url}>{url}</span>
                <button className="icon-btn delete" onClick={() => removeServer(idx)}>
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
          <div className="add-server-row">
            <input 
              type="text" 
              placeholder="stun:example.com:3478" 
              value={newStun}
              onChange={(e) => setNewStun(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addServer()}
            />
            <button className="icon-btn add" onClick={addServer} disabled={!newStun}>
              <PlusOutlined />
            </button>
          </div>
        </div>
      )}

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
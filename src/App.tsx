/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { 
  Thermometer, 
  Droplets, 
  Power, 
  Wifi, 
  WifiOff, 
  Lightbulb,
  Clock
} from 'lucide-react';

export default function App() {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [connectStatus, setConnectStatus] = useState<'Connecting' | 'Connected' | 'Disconnected'>('Disconnected');
  const [temperature, setTemperature] = useState<string>('--');
  const [humidity, setHumidity] = useState<string>('--');
  const [relays, setRelays] = useState<{ [key: number]: boolean }>({
    1: false, 2: false, 3: false, 4: false
  });
  const [lastUpdated, setLastUpdated] = useState<string>('--:--:--');
  const [clientIdState, setClientIdState] = useState<string>('');

  const updateTime = () => {
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString('id-ID', { hour12: false }));
  };

  useEffect(() => {
    const clientId = 'web-dashboard-' + Math.random().toString(16).substring(2, 8);
    setClientIdState(clientId);
    // Note: use wss:// instead of ws:// because AI Studio runs on HTTPS
    // and browsers block mixed active content.
    const url = 'wss://broker.hivemq.com:8884/mqtt';
    setConnectStatus('Connecting');
    
    // Using mqtt connect
    const mqttClient = mqtt.connect(url, {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 1000,
    });

    setClient(mqttClient);

    mqttClient.on('connect', () => {
      setConnectStatus('Connected');
      mqttClient.subscribe([
        'home/relay/+/status',
        'home/sensor/suhu',
        'home/sensor/kelembapan'
      ]);
      updateTime();
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      updateTime();
      
      if (topic === 'home/sensor/suhu') {
        setTemperature(payload);
      } else if (topic === 'home/sensor/kelembapan') {
        setHumidity(payload);
      } else if (topic.startsWith('home/relay/')) {
        const parts = topic.split('/');
        const relayId = parseInt(parts[2]);
        if (!isNaN(relayId) && relayId >= 1 && relayId <= 4 && parts[3] === 'status') {
          setRelays(prev => ({
            ...prev,
            [relayId]: payload === 'ON'
          }));
        }
      }
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    mqttClient.on('close', () => {
      setConnectStatus('Disconnected');
    });

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  const publishMQTT = (topic: string, message: string) => {
    if (client && connectStatus === 'Connected') {
      client.publish(topic, message, { qos: 0, retain: false });
    } else {
      console.warn('Cannot publish, MQTT not connected');
    }
  };

  const toggleRelay = (id: number) => {
    const newState = !relays[id];
    publishMQTT(`home/relay/${id}/set`, newState ? 'ON' : 'OFF');
  };

  const handleAllON = () => {
    [1, 2, 3, 4].forEach(id => {
      publishMQTT(`home/relay/${id}/set`, 'ON');
    });
  };

  const handleAllOFF = () => {
    [1, 2, 3, 4].forEach(id => {
      publishMQTT(`home/relay/${id}/set`, 'OFF');
    });
  };

  const handleVariasi = (variasi: string) => {
    publishMQTT('home/variasi/set', variasi);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center p-4 sm:p-8 font-sans text-slate-100">
      <div className="w-full max-w-[1024px] flex flex-col flex-grow">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Smart IoT <span className="text-[#ff6eb4]">Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">
              Real-time System Monitoring
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectStatus === 'Connected' 
                  ? 'bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]'
                  : connectStatus === 'Connecting'
                  ? 'bg-yellow-400 animate-pulse shadow-[0_0_8px_#fbbf24]'
                  : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`}></div>
              <span className={`text-xs font-medium uppercase tracking-wider ${
                connectStatus === 'Connected' ? 'text-[#00ff88]' : 
                connectStatus === 'Connecting' ? 'text-yellow-400' : 'text-red-500'
              }`}>
                {connectStatus === 'Connected' ? 'MQTT Connected' : connectStatus}
              </span>
            </div>
            <div className="h-4 w-[1px] bg-white/20"></div>
            <div className="text-xs font-mono text-slate-400 hidden sm:block">ID: {clientIdState}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow mb-8">
          
          {/* Sensor Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl flex-1 min-h-[180px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#00ff88] opacity-80">Temperature</span>
                <div className="p-2 bg-[#00ff88]/10 rounded-lg">
                  <Thermometer className="w-5 h-5 text-[#00ff88]" />
                </div>
              </div>
              <div>
                <div className="text-5xl font-black text-white leading-none">
                  {temperature}<span className="text-[#00ff88] text-3xl ml-1 font-light">°C</span>
                </div>
                <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] transition-all duration-500" style={{ width: !isNaN(Number(temperature)) ? `${Math.min(100, Math.max(0, (Number(temperature)/50)*100))}%` : '50%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl flex-1 min-h-[180px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff6eb4] opacity-80">Humidity</span>
                <div className="p-2 bg-[#ff6eb4]/10 rounded-lg">
                  <Droplets className="w-5 h-5 text-[#ff6eb4]" />
                </div>
              </div>
              <div>
                <div className="text-5xl font-black text-white leading-none">
                  {humidity}<span className="text-[#ff6eb4] text-3xl ml-1 font-light">%</span>
                </div>
                <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff6eb4] shadow-[0_0_10px_#ff6eb4] transition-all duration-500" style={{ width: !isNaN(Number(humidity)) ? `${Math.min(100, Math.max(0, Number(humidity)))}%` : '50%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Global Controls */}
            <div className="bg-[#141417]/50 border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Global Command Center</h3>
                <span className="text-[10px] text-white/30 tracking-[0.2em] hidden sm:block">SYSTEM OVERRIDE</span>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4">
                <button 
                  onClick={handleAllON}
                  className="flex-1 py-3 px-4 bg-[#00ff88]/10 border border-[#00ff88]/40 rounded-xl text-[#00ff88] text-xs font-black uppercase tracking-widest hover:bg-[#00ff88] hover:text-black transition-all text-center"
                >
                  All On
                </button>
                <button 
                  onClick={handleAllOFF}
                  className="flex-1 py-3 px-4 bg-[#ff6eb4]/10 border border-[#ff6eb4]/40 rounded-xl text-[#ff6eb4] text-xs font-black uppercase tracking-widest hover:bg-[#ff6eb4] hover:text-black transition-all text-center"
                >
                  All Off
                </button>
                <button 
                  onClick={() => handleVariasi('variasi1')}
                  className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all text-center"
                >
                  Variasi 1
                </button>
                <button 
                  onClick={() => handleVariasi('variasi2')}
                  className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all text-center"
                >
                  Variasi 2
                </button>
                <button 
                  onClick={() => handleVariasi('stop')}
                  className="col-span-2 sm:col-span-1 flex-1 py-3 px-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all text-center"
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Relay Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
              {[1, 2, 3, 4].map(id => (
                <div key={id} className={`bg-[#141417] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${!relays[id] ? 'opacity-70 shadow-inner' : 'group shadow-xl'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${relays[id] ? 'bg-[#00ff88]/10 border-[#00ff88]/20' : 'bg-white/5 border-white/10'}`}>
                      <div className={`w-3 h-3 rounded-full transition-colors ${relays[id] ? 'bg-[#00ff88] shadow-[0_0_12px_#00ff88]' : 'bg-slate-600'}`}></div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">Lampu {id}</div>
                      <div className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${relays[id] ? 'text-[#00ff88]' : 'text-slate-500'}`}>
                        {relays[id] ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => toggleRelay(id)}
                    className={`w-full sm:w-auto h-12 px-8 rounded-xl font-black text-xs uppercase tracking-tighter transition-all ${
                      relays[id] 
                        ? 'bg-[#00ff88] text-black hover:bg-[#00cc6a]' 
                        : 'bg-[#ff6eb4] text-black shadow-[0_0_15px_#ff6eb466] hover:bg-[#e05ea0]'
                    }`}
                  >
                    Switch
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Broker: hivemq.com:8443</div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest hidden sm:block">Protocol: WebSockets</div>
          </div>
          <div className="flex items-center gap-2 bg-[#ff6eb4]/10 px-3 py-1.5 rounded-lg border border-[#ff6eb4]/20">
            <Clock className="w-3 h-3 text-[#ff6eb4]" />
            <span className="text-[10px] font-mono font-bold text-[#ff6eb4]">LAST UPDATE: {lastUpdated}</span>
          </div>
        </footer>

      </div>
    </div>
  );
}


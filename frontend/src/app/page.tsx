'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useStore } from '../store';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Dashboard() {
  const [activeSlots, setActiveSlots] = useState<{id: number, port: string, time: string, status: string, type: string}[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [engineStatus, setEngineStatus] = useState('غير متصل');
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const { trucks, accounts, addTruck, removeAccount, updateTruckStatus } = useStore();

  const [truckCount, setTruckCount] = useState(1);
  const [currentView, setCurrentView] = useState<'system-login' | 'jwt-connect' | 'input' | 'slots'>('system-login');
  const [bookingStatuses, setBookingStatuses] = useState<Record<string, 'idle' | 'loading' | 'success'>>({});
  const [toastMessage, setToastMessage] = useState('');
  
  const [systemPassword, setSystemPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [jwtError, setJwtError] = useState('');

  const [tempTrucks, setTempTrucks] = useState(Array.from({length: 1}, () => ({ license: '', sequence: '', bayan: '' })));

  useEffect(() => {
    setTempTrucks(Array.from({length: truckCount}, (_, i) => tempTrucks[i] || { license: '', sequence: '', bayan: '' }));
  }, [truckCount]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setEngineStatus('متصل بالخادم');
    });

    newSocket.on('engine_login_success', () => {
      setEngineStatus('الرادار نشط 🟢');
      setIsMonitoring(true);
      setCurrentView('input'); // Proceed to dashboard after successful JWT connection
    });

    newSocket.on('engine_slot_found', (data) => {
      setActiveSlots(prev => [data, ...prev].slice(0, 10)); // Keep last 10 slots
    });

    return () => { newSocket.close(); }
  }, []);

  const handleSystemLogin = () => {
    if (systemPassword === 'admin123') { // Simple hardcoded password for now
      setCurrentView('jwt-connect');
      setPasswordError('');
    } else {
      setPasswordError('كلمة المرور غير صحيحة');
    }
  };

  const connectEngine = async () => {
    if (!jwtToken) {
      setJwtError('يرجى إدخال التوكن');
      return;
    }
    if (!socket || !socket.id) {
      setJwtError('جاري الاتصال بالسيرفر المركزي، انتظر قليلاً...');
      return;
    }
    setEngineStatus('جاري التحقق من التوكن...');
    try {
      await fetch(`${BACKEND_URL}/api/start-engine`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwtToken, socketId: socket.id })
      });
      setJwtError('');
      // View change is handled by engine_login_success socket event
    } catch (e) {
      console.error('Failed to start engine', e);
      setEngineStatus('خطأ في الاتصال');
      setJwtError('فشل الاتصال بمنصة فسح');
    }
  };

  const handleBook = (slotId: number, truckId: number) => {
    const key = `${slotId}-${truckId}`;
    setBookingStatuses(prev => ({ ...prev, [key]: 'loading' }));
    
    // Simulate booking delay and success
    setTimeout(() => {
      setBookingStatuses(prev => ({ ...prev, [key]: 'success' }));
      updateTruckStatus(truckId, 'Booked'); // Remove truck from pool
      
      const truckSequence = trucks.find(t => t.id === truckId)?.sequence || 'غير معروف';
      setToastMessage(`🎉 تم قنص موعد للشاحنة (${truckSequence}) بنجاح!`);
      
      setTimeout(() => setToastMessage(''), 4000); // Hide toast after 4s
    }, 800);
  };

  const handleSaveAllTrucks = () => {
    tempTrucks.forEach(t => {
      if(t.license && t.sequence) addTruck(t);
    });
    alert(`تم حفظ ${tempTrucks.length} شاحنة بنجاح`);
  };

  const updateTempTruck = (index: number, field: string, value: string) => {
    const newTrucks = [...tempTrucks];
    newTrucks[index] = { ...newTrucks[index], [field]: value };
    setTempTrucks(newTrucks);
  };

  // 1. SYSTEM LOGIN SCREEN
  if (currentView === 'system-login') {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-md border border-gray-100 text-center">
          <div className="flex justify-center mb-4">
            <span className="text-[#0ea5e9] text-5xl font-bold">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-[#0ea5e9] mb-2">SUPER FASAH</h1>
          <p className="text-gray-500 mb-8 font-medium">نظام الحجز اللوجستي الذكي</p>
          
          <div className="space-y-4">
            <div>
              <input 
                type="password" 
                placeholder="أدخل كلمة مرور النظام"
                className="w-full bg-gray-50 border border-gray-200 rounded p-4 text-gray-800 outline-none focus:border-[#0ea5e9] text-center text-lg tracking-widest"
                value={systemPassword}
                onChange={e => setSystemPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSystemLogin()}
              />
              {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
            </div>
            <button 
              onClick={handleSystemLogin}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold py-4 rounded transition-colors text-lg"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. JWT CONNECT SCREEN
  if (currentView === 'jwt-connect') {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-lg border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#0ea5e9]"></div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ربط الجلسة (Fasah API)</h2>
          <p className="text-gray-500 mb-8 text-sm">قم بنسخ التوكن (JWT) من متصفحك ولصقه هنا للربط مع منصة فسح مباشرة وبسرعة فائقة.</p>
          
          <div className="space-y-4">
            <div>
              <textarea 
                placeholder="eyJhbGciOiJIUzUxMiJ9..."
                className="w-full bg-gray-50 border border-gray-200 rounded p-4 text-gray-800 outline-none focus:border-[#0ea5e9] text-left font-mono text-sm h-32 resize-none"
                value={jwtToken}
                onChange={e => setJwtToken(e.target.value)}
                dir="ltr"
              ></textarea>
              {jwtError && <p className="text-red-500 text-sm mt-2">{jwtError}</p>}
            </div>
            <button 
              onClick={connectEngine}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              تفعيل الاتصال المباشر
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD VIEWS
  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1a202c] font-sans p-8 relative" dir="rtl">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#10b981] text-white px-6 py-3 rounded-lg shadow-lg font-bold flex items-center gap-3 animate-fade-in-up">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-[#0ea5e9] text-3xl font-bold">⚡</span>
          <div>
            <h1 className="text-2xl font-bold text-[#0ea5e9]">SUPER FASAH</h1>
            <p className="text-gray-500 text-sm">نظام الحجز الآلي متعدد الشاحنات</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
            <span className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-yellow-400'}`}></span>
            <span className="text-sm text-gray-700 font-medium">{engineStatus}</span>
          </div>
          <button 
            onClick={() => setCurrentView('system-login')} 
            className="text-gray-500 hover:text-red-500 font-medium px-4 py-2 rounded-md transition-colors text-sm"
          >
            تسجيل خروج
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {currentView === 'input' ? (
          /* TRUCK INPUT VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT PANEL */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-[#0ea5e9] mb-2">⚡ SUPER FASAH</h2>
                <p className="text-gray-500">أدخل بيانات الشاحنات</p>
              </div>
              
              <div className="w-full max-w-xs flex items-center justify-between mb-8">
                <span className="font-bold text-gray-700">عدد الشاحنات:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="10"
                  className="w-20 border border-gray-300 rounded p-1 text-center outline-none focus:border-[#0ea5e9]"
                  value={truckCount}
                  onChange={(e) => setTruckCount(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <button 
                onClick={() => isMonitoring ? setCurrentView('slots') : null}
                className="w-full max-w-xs bg-[#10b981] hover:bg-[#059669] text-white font-bold py-3 rounded transition-colors flex justify-center items-center gap-2"
              >
                عرض المواعيد المتاحة ←
              </button>
            </div>

            {/* RIGHT PANEL - TRUCK DATA */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">بيانات الشاحنات</h2>
                <button 
                  onClick={handleSaveAllTrucks}
                  className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 py-2 rounded transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                  حفظ جميع البيانات
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {tempTrucks.map((truck, idx) => (
                  <div key={idx} className="border border-gray-200 p-5 rounded relative">
                    <span className="absolute -top-3 right-4 bg-white px-2 text-sm text-gray-500 font-bold">الشاحنة {idx + 1}</span>
                    <div className="space-y-4 mt-2">
                      <div>
                        <input 
                          type="text" 
                          placeholder="رقم رخصة السائق"
                          className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9] focus:bg-white text-center"
                          value={truck.license}
                          onChange={e => updateTempTruck(idx, 'license', e.target.value)}
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="رقم تسلسل المركبة"
                          className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9] focus:bg-white text-center"
                          value={truck.sequence}
                          onChange={e => updateTempTruck(idx, 'sequence', e.target.value)}
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="رقم البيان"
                          className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9] focus:bg-white text-center"
                          value={truck.bayan}
                          onChange={e => updateTempTruck(idx, 'bayan', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* SLOTS VIEW */
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[600px] p-6 relative">
            <button 
              onClick={() => setCurrentView('input')}
              className="absolute top-6 left-6 text-gray-500 hover:text-gray-800 bg-gray-100 px-4 py-2 rounded text-sm font-bold border border-gray-200"
            >
              ← رجوع
            </button>
            
            <h2 className="text-2xl font-bold text-[#1e293b] mb-6 border-b pb-4">المواعيد المتاحة</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 font-bold text-gray-700">التاريخ والوقت</th>
                    <th className="p-4 font-bold text-gray-700">المنفذ</th>
                    <th className="p-4 font-bold text-gray-700 text-center">الشاحنات المتاحة</th>
                    <th className="p-4 font-bold text-gray-700">حجز سريع</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSlots.map(slot => (
                    <tr key={slot.id} className="border-b border-gray-100 hover:bg-[#f8fafc] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-[#0ea5e9]">{slot.time.split(' -> ')[1]}</div>
                        <div className="text-xs text-gray-500">{slot.time.split(' -> ')[0]}</div>
                      </td>
                      <td className="p-4 text-gray-700 font-medium">{slot.port}</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                          {slot.availableTrucks}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {trucks.filter(t => t.status !== 'Booked').length > 0 ? trucks.filter(t => t.status !== 'Booked').map((truck, idx) => {
                            const statusKey = `${slot.id}-${truck.id}`;
                            const status = bookingStatuses[statusKey] || 'idle';
                            
                            return (
                              <button 
                                key={truck.id} 
                                onClick={() => handleBook(slot.id, truck.id)}
                                disabled={status !== 'idle'}
                                title={`شاحنة ${idx + 1} - تسلسل: ${truck.sequence}`}
                                className={`px-4 py-2 rounded font-bold text-sm transition-all shadow-sm ${
                                  status === 'success' ? 'bg-[#10b981] text-white cursor-default' : 
                                  status === 'loading' ? 'bg-[#0284c7] text-white/80 cursor-wait' : 
                                  'bg-[#0ea5e9] hover:bg-[#0284c7] hover:shadow-md text-white'
                                }`}
                              >
                                {status === 'success' ? `✓ ش ${idx + 1}` : 
                                 status === 'loading' ? '...' : 
                                 `ش ${idx + 1}`}
                              </button>
                            );
                          }) : (
                            <button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-4 py-2 rounded text-sm">
                              حجز
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {activeSlots.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-b-lg">
                  <div className={`mx-auto w-10 h-10 border-4 border-gray-200 border-t-[#0ea5e9] rounded-full ${isMonitoring ? 'animate-spin' : ''} mb-4`}></div>
                  <p className="text-gray-500 font-medium">
                    {isMonitoring ? 'جاري البحث عن مواعيد متاحة بسرعة فائقة...' : 'النظام متوقف. يرجى تسجيل الدخول.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

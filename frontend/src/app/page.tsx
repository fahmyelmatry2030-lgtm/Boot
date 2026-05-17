'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function Dashboard() {
  const [activeSlots, setActiveSlots] = useState<{id: number, port: string, time: string, status: string, type: string, availableTrucks: number}[]>([]);
  const [engineStatus, setEngineStatus] = useState('غير متصل');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { trucks, accounts, addTruck, removeAccount, updateTruckStatus } = useStore();

  const [truckCount, setTruckCount] = useState(1);
  const [currentView, setCurrentView] = useState<'system-login' | 'jwt-connect' | 'input' | 'slots'>('system-login');
  const [bookingStatuses, setBookingStatuses] = useState<Record<string, 'idle' | 'loading' | 'success'>>({});
  const [toastMessage, setToastMessage] = useState('');
  
  const [systemPassword, setSystemPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [jwtError, setJwtError] = useState('');

  // Fasah Search Filters
  const [filterPurpose, setFilterPurpose] = useState('عبور');
  const [filterType, setFilterType] = useState('دخول');
  const [filterPort, setFilterPort] = useState('جمرك البطحاء');

  const [tempTrucks, setTempTrucks] = useState(Array.from({length: 1}, () => ({ license: '', sequence: '', bayan: '' })));

  useEffect(() => {
    setTempTrucks(Array.from({length: truckCount}, (_, i) => tempTrucks[i] || { license: '', sequence: '', bayan: '' }));
  }, [truckCount]);

  useEffect(() => {
    // Restore session on load
    const savedToken = localStorage.getItem('fasah_jwtToken');
    const isLoggedIn = localStorage.getItem('fasah_isLoggedIn');
    const savedView = localStorage.getItem('fasah_currentView') as typeof currentView;
    
    if (isLoggedIn === 'true') {
      if (savedToken) {
        setJwtToken(savedToken);
        setIsMonitoring(true);
        setEngineStatus('الرادار نشط 🟢 (بدون خادم خارجي)');
        setCurrentView(savedView && savedView === 'slots' ? 'slots' : 'input');
      } else {
        setCurrentView('jwt-connect');
      }
    }

    // Cleanup polling on unmount
    return () => { 
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, []);

  // Handle automatic polling when monitoring is active
  useEffect(() => {
    if (isMonitoring && jwtToken) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      // Run once immediately, then every 2 seconds
      fetchSlots();
      pollingRef.current = setInterval(fetchSlots, 2000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isMonitoring, jwtToken, filterPurpose, filterType, filterPort, trucks]);

  // Persist view state
  useEffect(() => {
    localStorage.setItem('fasah_currentView', currentView);
  }, [currentView]);

  const handleSystemLogin = () => {
    if (systemPassword === 'admin123') { // Simple hardcoded password for now
      localStorage.setItem('fasah_isLoggedIn', 'true');
      setCurrentView('jwt-connect');
      setPasswordError('');
    } else {
      setPasswordError('كلمة المرور غير صحيحة');
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/check-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jwtToken,
          purpose: filterPurpose,
          type: filterType,
          port: filterPort,
          trucks: trucks // Send the trucks to the backend to check their Bayan numbers
        })
      });
      
      const data = await res.json();
      if (data.success && data.slots && data.slots.length > 0) {
        setActiveSlots(prev => {
          const newSlots = [...data.slots, ...prev];
          const unique = Array.from(new Map(newSlots.map(item => [item.id, item])).values());
          return unique.slice(0, 10);
        });
      }
    } catch (e) {
      console.error('Polling error', e);
    }
  };

  const connectEngine = async () => {
    if (!jwtToken) {
      setJwtError('يرجى إدخال التوكن');
      return;
    }
    
    setEngineStatus('جاري تفعيل الرادار الداخلي (Vercel)...');
    
    // Save token to persist session
    localStorage.setItem('fasah_jwtToken', jwtToken);
    
    // Switch view immediately to feel fast
    setJwtError('');
    setIsMonitoring(true);
    setEngineStatus('الرادار نشط 🟢 (بدون خادم خارجي)');
    setCurrentView('input');
    
    // Polling is now handled automatically by the useEffect hook
  };

  const handleBook = async (slotId: number, truckId: number) => {
    const key = `${slotId}-${truckId}`;
    setBookingStatuses(prev => ({ ...prev, [key]: 'loading' }));
    
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwtToken, slotId, truckId })
      });
      const data = await res.json();
      
      if (data.success) {
        setBookingStatuses(prev => ({ ...prev, [key]: 'success' }));
        updateTruckStatus(truckId, 'Booked');
        
        const truckSequence = trucks.find(t => t.id === truckId)?.sequence || 'غير معروف';
        setToastMessage(`🎉 تم حجز موعد الشاحنة (${truckSequence}) بنجاح! المرجع: ${data.reference}`);
        
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setBookingStatuses(prev => ({ ...prev, [key]: 'idle' }));
        alert('فشل الحجز: ' + data.error);
      }
    } catch (e) {
      setBookingStatuses(prev => ({ ...prev, [key]: 'idle' }));
      alert('حدث خطأ أثناء الاتصال');
    }
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
            onClick={() => {
              setIsMonitoring(false);
              localStorage.removeItem('fasah_isLoggedIn');
              localStorage.removeItem('fasah_jwtToken');
              localStorage.removeItem('fasah_currentView');
              setJwtToken('');
              setCurrentView('system-login');
            }} 
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
              <div className="w-full max-w-sm space-y-4 mb-8 text-right">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الغرض *</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9]"
                    value={filterPurpose}
                    onChange={(e) => setFilterPurpose(e.target.value)}
                  >
                    <option value="عبور">عبور</option>
                    <option value="استيراد">استيراد</option>
                    <option value="تصدير">تصدير</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">نوع موعد العبور *</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9]"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="دخول">دخول</option>
                    <option value="خروج">خروج</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">منفذ الوصول *</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 outline-none focus:border-[#0ea5e9]"
                    value={filterPort}
                    onChange={(e) => setFilterPort(e.target.value)}
                  >
                    <option value="جمرك البطحاء">جمرك البطحاء</option>
                    <option value="ميناء جدة الإسلامي">ميناء جدة الإسلامي</option>
                    <option value="ميناء الملك عبدالعزيز بالدمام">ميناء الملك عبدالعزيز بالدمام</option>
                  </select>
                </div>
              </div>

              <div className="w-full max-w-sm flex items-center justify-between mb-8 border-t border-gray-100 pt-6">
                <span className="font-bold text-gray-700">عدد الشاحنات المراد قنصها:</span>
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
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-[#1e293b]">المواعيد المتاحة</h2>
              <div className="flex gap-4">
                <button 
                  onClick={fetchSlots}
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  تحديث
                </button>
                <button 
                  onClick={() => setCurrentView('input')}
                  className="text-gray-500 hover:text-gray-800 bg-gray-100 px-4 py-2 rounded text-sm font-bold border border-gray-200 transition-colors"
                >
                  ← رجوع
                </button>
              </div>
            </div>

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

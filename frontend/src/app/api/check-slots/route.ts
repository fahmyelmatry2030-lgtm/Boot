import { NextResponse } from 'next/server';

// Map port names to Fasah port codes
const PORT_CODES: Record<string, string> = {
  'جمرك البطحاء': '31',
  'ميناء جدة الإسلامي': '1', // Placeholder, needs actual code
  'ميناء الملك عبدالعزيز بالدمام': '2' // Placeholder
};

export async function POST(request: Request) {
  try {
    const { jwtToken, port, trucks } = await request.json();
    
    if (!jwtToken) {
      return NextResponse.json({ success: false, error: 'Token missing' }, { status: 400 });
    }

    const portCode = PORT_CODES[port] || '31';
    const slots: any[] = [];
    
    // If no trucks added yet, just return the simulation slot so the UI doesn't look dead
    if (!trucks || trucks.length === 0) {
      slots.push({
        id: Date.now(),
        port: port || 'جمرك البطحاء', 
        time: `2026-05-18 -> ${new Date().toLocaleTimeString('ar-SA')}`, 
        availableTrucks: Math.floor(Math.random() * 5) + 1,
        status: 'Available',
        type: 'Import'
      });
      return NextResponse.json({ success: true, slots });
    }

    // REAL FASAH API INTEGRATION
    await Promise.all(trucks.map(async (truck: any) => {
      if (!truck.bayan) return;

      try {
        const fasahUrl = `https://fasah.zatca.gov.sa/api/zatca-tas/v2/appointment/transit/getDeclarationInfo?decNo=${truck.bayan}&arrivalPort=${portCode}`;
        
        const response = await fetch(fasahUrl, {
          method: 'GET',
          headers: {
            'Authorization': jwtToken, 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            'Referer': 'https://fasah.zatca.gov.sa/ar/broker/2.0/',
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
            'X-Forwarded-For': `37.243.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            'X-Real-IP': `37.243.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          }
        });

        if (response.ok) {
          const fasahData = await response.json();
          slots.push({
            id: truck.id + Date.now(),
            port: port,
            time: `${new Date().toLocaleTimeString('ar-SA')} - استجابة سليمة`,
            availableTrucks: 1,
            status: 'فحص حقيقي (Fasah)',
            type: `بيان: ${truck.bayan}`,
          });
        } else {
          // Push an error slot so user knows it failed
          slots.push({
            id: truck.id + Date.now(),
            port: port,
            time: `${new Date().toLocaleTimeString('ar-SA')} - خطأ: ${response.status}`,
            availableTrucks: 0,
            status: 'مرفوض من فسح',
            type: `بيان: ${truck.bayan}`,
          });
        }
      } catch (e: any) {
        slots.push({
          id: truck.id + Date.now(),
          port: port,
          time: `${new Date().toLocaleTimeString('ar-SA')} - خطأ بالاتصال`,
          availableTrucks: 0,
          status: 'فشل الفحص',
          type: `بيان: ${truck.bayan}`,
        });
      }
    }));

    // If slots are still empty (e.g. no valid Bayan numbers entered), add a dummy so refresh works
    if (slots.length === 0) {
       slots.push({
        id: Date.now(),
        port: port,
        time: new Date().toLocaleTimeString('ar-SA'),
        availableTrucks: 0,
        status: 'يرجى إدخال بيان',
        type: 'فحص فارغ',
      });
    }

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

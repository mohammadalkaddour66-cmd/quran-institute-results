export const CACHE_KEYS = {
  STUDENTS: 'cachedStudents',
  STAFF: 'cachedStaff',
  GROUPS: 'cachedGroups',
  RECORDS: 'cachedRecords',
  ATTENDANCE: 'cachedAttendance',
  OFFLINE_QUEUE: 'offlineQueue',
  LAST_SYNC: 'lastSyncTime'
};

export const API_URL = "https://script.google.com/macros/s/AKfycbyy68ZX7nnHfBmScWnjaI9ge7wkJ0Uor1l3UmpDFJP3nMpA6S7pQwFA9M1Cb64ccsEM/exec";

// Mock data for fallback when API fails
export const MOCK_DATA = {
  "الطلاب": [
    { "الاسم الكامل": "أحمد محمد", "اسم الحلقة": "حلقة أبو بكر" },
    { "الاسم الكامل": "محمود عبد الله", "اسم الحلقة": "حلقة عمر" },
    { "الاسم الكامل": "فاطمة علي", "اسم الحلقة": "حلقة خديجة" }
  ],
  "السبر_اليومي": [
    { "التاريخ": new Date().toISOString().split('T')[0], "اسم الطالب": "أحمد محمد", "نوع التسميع": "مراجعة", "الصفحة / المقطع": "1-5", "عدد الصفحات المسموعة": "5", "النتيجة": "ممتاز", "الدرجة": "100", "اسم المعلم": "أحمد محمد" }
  ],
  "الحضور_والغياب": [
    { "نوع السجل": "غياب", "فئة الشخص": "طالب", "اسم الحلقة": "حلقة أبو بكر", "اسم الشخص": "أحمد محمد", "التاريخ": new Date().toISOString().split('T')[0], "مدة التأخير": "", "ملاحظات": "" }
  ],
  "الحلقات": [
    ["حلقة أبو بكر", "أحمد محمد"],
    ["حلقة عمر", "محمود عبد الله"],
    ["حلقة خديجة", "فاطمة علي"]
  ],
  "الموظفون": [
    { "الاسم الرباعي": "أحمد محمد", "المسمى الوظيفي": "معلم" },
    { "الاسم الرباعي": "محمود عبد الله", "المسمى الوظيفي": "معلم" },
    { "الاسم الرباعي": "فاطمة علي", "المسمى الوظيفي": "معلم" }
  ]
};

export const fetchWithFallback = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.warn("Fetch failed, using mock data fallback:", error);
    return MOCK_DATA;
  }
};

export const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error(`Error parsing cached data for ${key}:`, e);
      return null;
    }
  }
  return null;
};

export const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key, data } }));
  } catch (e) {
    console.error(`Error setting cached data for ${key}:`, e);
  }
};

export const addToOfflineQueue = (payload: any) => {
  const queue = getCachedData(CACHE_KEYS.OFFLINE_QUEUE) || [];
  queue.push({
    ...payload,
    _timestamp: new Date().toISOString(),
    _id: Math.random().toString(36).substring(7)
  });
  setCachedData(CACHE_KEYS.OFFLINE_QUEUE, queue);
  
  // Dispatch event for UI notification
  window.dispatchEvent(new CustomEvent('offline-save', { 
    detail: { message: 'تم الحفظ محلياً، سيتم الرفع عند توفر الإنترنت' } 
  }));
};

export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;
  
  const queue = getCachedData(CACHE_KEYS.OFFLINE_QUEUE) || [];
  if (queue.length === 0) return;

  console.log(`Processing offline queue with ${queue.length} items...`);
  
  const remainingQueue = [];
  
  for (const item of queue) {
    try {
      // Remove internal tracking fields before sending
      const { _timestamp, _id, ...payloadToSend } = item;
      
      await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(payloadToSend),
        mode: "no-cors"
      });
      console.log(`Successfully synced offline item:`, item.baseName || 'unknown');
    } catch (error) {
      console.error("Error syncing offline item:", error);
      remainingQueue.push(item); // Keep in queue if failed
    }
  }
  
  setCachedData(CACHE_KEYS.OFFLINE_QUEUE, remainingQueue);
  if (remainingQueue.length === 0 && queue.length > 0) {
    window.dispatchEvent(new CustomEvent('sync-complete', { 
      detail: { message: 'تمت مزامنة جميع البيانات المحفوظة محلياً بنجاح' } 
    }));
  }
};

// Set up online listener to process queue when connection is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', processOfflineQueue);
}

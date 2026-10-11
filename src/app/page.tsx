'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import BannerFilter from '@/components/BannerFilter';
import CategoryCards from '@/components/CategoryCards';
import CourtGrid, { Court } from '@/components/CourtGrid';
import BookingSuccessModal from '@/components/BookingSuccessModal';

const INITIAL_COURTS: Court[] = [
  { id: 1, name: 'คอร์ท 1', status: 'green' },
  { id: 2, name: 'คอร์ท 2', status: 'green' },
  { id: 3, name: 'คอร์ท 3', status: 'yellow' },
  { id: 4, name: 'คอร์ท 4', status: 'red' },
  { id: 5, name: 'คอร์ท 5', status: 'green' },
  { id: 6, name: 'คอร์ท 6', status: 'green' },
  { id: 7, name: 'คอร์ท 7', status: 'yellow' },
  { id: 8, name: 'คอร์ท 8', status: 'green' },
  { id: 9, name: 'คอร์ท 9', status: 'green' },
  { id: 10, name: 'คอร์ท 10', status: 'green' },
  { id: 11, name: 'คอร์ท 11', status: 'green' },
  { id: 12, name: 'คอร์ท 12', status: 'green' },
];

export default function HomePage() {
  const { data: session } = useSession();

  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 1. โหลดประวัติการจองจาก localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('bookingHistory');
    if (saved) {
      try {
        setBookingHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 2. บันทึกประวัติการจองลง localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('bookingHistory', JSON.stringify(bookingHistory));
    }
  }, [bookingHistory, isMounted]);

  const [activeTab, setActiveTab] = useState<'booking' | 'history'>('booking');
  const [step, setStep] = useState<'filter' | 'court'>('filter');
  const [pendingBookingConfirm, setPendingBookingConfirm] = useState(false);

  const [filter, setFilter] = useState({
    type: 'กลุ่ม 4-6',
    court: 'สนาม 1',
    date: '2026-03-10',
    startTime: '18:00',
    duration: '1 ชั่วโมง',
  });

  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);

  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [note, setNote] = useState('');
  const [rentRacket, setRentRacket] = useState(false);
  const [racketCount, setRacketCount] = useState(1);
  const [rentShoes, setRentShoes] = useState(false);
  const [shoesCount, setShoesCount] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestBooking, setLatestBooking] = useState<any>(null);

  // 🔄 3. อัปเดตสถานะคอร์ทให้เป็นสีแดงอัตโนมัติ (พร้อมระบบแปลงชื่อคอร์ทกันความคลาดเคลื่อน)
  useEffect(() => {
    if (!isMounted) return;

    // ดึงคอร์ททั้งหมดที่เคยถูกจองตรงกับ Date และ StartTime ปัจจุบัน
    const rawBookedCourts = bookingHistory
      .filter(
        (b) => b.date === filter.date && b.startTime === filter.startTime
      )
      .flatMap((b) => b.selectedCourts || []);

    // แปลงชื่อให้เป็นมาตรฐานเดียวกัน เช่น "สนาม 8" หรือ "คอร์ท 8" ให้เหลือแค่ตัวเลข "8"
    const bookedNumbers = rawBookedCourts.map((c: string) =>
      c.replace(/[^0-9]/g, '')
    );

    setCourts(
      INITIAL_COURTS.map((court) => {
        const courtNumber = court.name.replace(/[^0-9]/g, '');
        // ถ้าเลขคอร์ทตรงกับที่มีในประวัติการจอง ให้ปรับสถานะเป็นสีแดง 'red'
        if (bookedNumbers.includes(courtNumber)) {
          return { ...court, status: 'red' };
        }
        return court;
      })
    );
  }, [filter.date, filter.startTime, bookingHistory, isMounted]);

  // ตั้งชื่อผู้จองอัตโนมัติเมื่อได้ Session จาก Google
  useEffect(() => {
    if (session?.user?.name && !userName) {
      setUserName(session.user.name);
    }
  }, [session, userName]);

  // เมื่อล็อกอิน Google สำเร็จหากมีรายการค้างจองอยู่ ให้ยืนยันการจองต่อทันที
  useEffect(() => {
    if (session && pendingBookingConfirm) {
      processBooking();
      setPendingBookingConfirm(false);
    }
  }, [session, pendingBookingConfirm]);

  // บังคับล็อกอินก่อนไปหน้าเลือกคอร์ท
  const handleSearch = () => {
    if (!session) {
      alert(
        'กรุณาเข้าสู่ระบบด้วย Google ก่อนทำรายการจองสนาม เพื่อบันทึกประวัติการจองนำไปยื่นหน้าเคาน์เตอร์'
      );
      signIn('google');
      return;
    }
    setStep('court');
  };

  const processBooking = () => {
    const calculatedTotalPrice =
      selectedCourts.length * 150 * (parseInt(filter.duration) || 1) +
      (rentRacket ? racketCount * 50 : 0) +
      (rentShoes ? shoesCount * 50 : 0);

    const addonsData = {
      shoesCount: rentShoes ? shoesCount : 0,
      shoesPrice: rentShoes ? shoesCount * 50 : 0,
      extraItems: [
        rentRacket ? `เช่าไม้แบดมินตัน (${racketCount} ไม้)` : '',
      ].filter(Boolean),
    };

    const newBooking = {
      id: Date.now(),
      userName: userName || session?.user?.name || 'ผู้ใช้งาน',
      userEmail: session?.user?.email || 'ไม่ระบุอีเมล',
      userPhone,
      selectedCourts,
      date: filter.date,
      startTime: filter.startTime,
      duration: filter.duration,
      totalPrice: calculatedTotalPrice,
      addons: addonsData,
      note,
    };

    setLatestBooking(newBooking);
    setBookingHistory((prev) => [newBooking, ...prev]);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = () => {
    if (selectedCourts.length === 0) {
      alert('กรุณาเลือกคอร์ทอย่างน้อย 1 คอร์ท');
      return;
    }

    if (!session) {
      alert('กรุณาเข้าสู่ระบบด้วย Google ก่อนทำรายการจอง');
      setPendingBookingConfirm(true);
      signIn('google');
      return;
    }

    processBooking();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCourts([]);
    setUserPhone('');
    setNote('');
    setRentRacket(false);
    setRentShoes(false);
    setStep('filter');
    setActiveTab('history');
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 py-10 px-4 flex flex-col items-center">
      {/* Header + โปรไฟล์ Google / ปุ่มล็อกอิน */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 px-2">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-sky-400 to-blue-500 tracking-widest drop-shadow-[0_0_25px_rgba(56,189,248,0.6)]">
          TEEBADMAIJA
        </h1>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-9 h-9 rounded-full border border-sky-400/50 shadow-md"
                />
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-200">
                  {session.user?.name}
                </span>
                <span className="text-[10px] text-sky-400">
                  {session.user?.email}
                </span>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-bold rounded-xl transition duration-300 shadow-md cursor-pointer"
              >
                🚪 ออกจากระบบ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signIn('google')}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition duration-300 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>
          )}
        </div>
      </div>

      {/* แถบ Tab เลือกหน้า */}
      <div className="flex justify-center items-center gap-3 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl mb-8 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('booking');
            setStep('filter');
          }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition duration-300 cursor-pointer ${
            activeTab === 'booking'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          🏸 จองสนาม
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition duration-300 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#00aaff] text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          📜 ประวัติการจอง ({isMounted ? bookingHistory.length : 0})
        </button>
      </div>

      {/* ส่วนแสดงเนื้อหาหลักตาม Step */}
      <div className="w-full max-w-5xl">
        {activeTab === 'booking' ? (
          step === 'filter' ? (
            <BannerFilter filter={filter} setFilter={setFilter} onSubmit={handleSearch} />
          ) : (
            <CourtGrid
              filter={filter}
              courts={courts}
              selectedCourts={selectedCourts}
              setSelectedCourts={setSelectedCourts}
              userName={userName}
              setUserName={setUserName}
              userPhone={userPhone}
              setUserPhone={setUserPhone}
              note={note}
              setNote={setNote}
              rentRacket={rentRacket}
              setRentRacket={setRentRacket}
              racketCount={racketCount}
              setRacketCount={setRacketCount}
              rentShoes={rentShoes}
              setRentShoes={setRentShoes}
              shoesCount={shoesCount}
              setShoesCount={setShoesCount}
              onBack={() => setStep('filter')}
              onConfirm={handleConfirmBooking}
              courtPricePerHour={150}
              racketPrice={50}
              shoesPrice={50}
            />
          )
        ) : (
          <CategoryCards
            bookingHistory={bookingHistory}
            onNavigateToBooking={() => {
              setActiveTab('booking');
              setStep('filter');
            }}
          />
        )}
      </div>

      {/* ป๊อปอัปแจ้งผลการจองสำเร็จ */}
      <BookingSuccessModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        bookingDetails={latestBooking}
      />
    </main>
  );
}
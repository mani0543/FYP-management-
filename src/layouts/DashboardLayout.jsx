import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState(null);

  const fetchStudentStatus = async () => {
    if (user?.capabilities?.includes('STUDENT')) {
      try {
        const res = await api.get('/student/status');
        if (res.success) {
          setStudentData(res);
        }
      } catch (err) {
        console.warn('Student status fetch error:', err.message);
      }
    }
  };

  useEffect(() => {
    fetchStudentStatus();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      <Header />
      <div className="flex-1 flex">
        <Sidebar studentData={studentData} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet context={{ studentData, refreshStudentStatus: fetchStudentStatus }} />
        </main>
      </div>
    </div>
  );
}

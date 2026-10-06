import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('fyp_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.get('/auth/me');
      if (data.success) {
        setUser(data.user);
        setAssignments(data.assignments || []);
        setStudentProfile(data.student || null);

        // Auto-select first active assignment if not set
        if (data.assignments && data.assignments.length > 0) {
          const savedAssignmentId = localStorage.getItem('fyp_active_assignment_id');
          const matched = data.assignments.find((a) => (a._id || a.id) === savedAssignmentId);
          setActiveAssignment(matched || data.assignments[0]);
        }
      }
    } catch (err) {
      console.warn('Session check failed:', err.message);
      localStorage.removeItem('fyp_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
      setAssignments([]);
      setActiveAssignment(null);
      setStudentProfile(null);
    };

    window.addEventListener('fyp:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('fyp:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('fyp_token', res.token);
      setUser(res.user);
      setAssignments(res.assignments || []);
      setStudentProfile(res.student || null);
      if (res.assignments && res.assignments.length > 0) {
        setActiveAssignment(res.assignments[0]);
        localStorage.setItem('fyp_active_assignment_id', res.assignments[0]._id || res.assignments[0].id);
      }
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('fyp_token');
    localStorage.removeItem('fyp_active_assignment_id');
    setUser(null);
    setAssignments([]);
    setActiveAssignment(null);
    setStudentProfile(null);
  };

  const switchAssignment = (assignment) => {
    setActiveAssignment(assignment);
    localStorage.setItem('fyp_active_assignment_id', assignment._id || assignment.id);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        assignments,
        activeAssignment,
        studentProfile,
        loading,
        login,
        logout,
        switchAssignment,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

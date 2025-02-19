import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Diamond, Users, ShoppingCart, Video, Bell, Settings, LogOut, Calculator, Menu, X } from 'lucide-react';
import { signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';

// ... rest of the Layout component code stays the same ...

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

// ... rest of the Layout component code stays the same ...

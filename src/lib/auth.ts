import { supabase } from './supabase';

export interface UserRole {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'sales' | 'qc' | 'packaging' | 'dispatch';
  permissions: string[];
}

export const ROLE_PERMISSIONS = {
  admin: [
    'manage_staff',
    'manage_settings',
    'manage_inventory',
    'manage_customers',
    'manage_video_calls',
    'manage_quotations',
    'view_analytics',
    'view_inventory',
    'manage_qc',
    'manage_packaging',
    'manage_dispatch'
  ],
  manager: [
    'manage_inventory',
    'manage_customers',
    'manage_video_calls',
    'manage_quotations',
    'view_analytics'
  ],
  sales: [
    'view_inventory',
    'manage_customers',
    'manage_video_calls',
    'manage_quotations'
  ],
  qc: [
    'view_inventory',
    'manage_qc'
  ],
  packaging: [
    'view_inventory',
    'manage_packaging'
  ],
  dispatch: [
    'view_inventory',
    'manage_dispatch'
  ]
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // Get staff details
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();

    if (staffError) throw staffError;

    // Store staff details in local storage
    localStorage.setItem('staffRole', staffData.role);
    localStorage.setItem('staffId', staffData.id);
    localStorage.setItem('staffName', staffData.name);

    return { user: authData.user, staff: staffData };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear local storage
    localStorage.removeItem('staffRole');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const createStaffUser = async (email: string, password: string, name: string, role: string) => {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role
        }
      }
    });

    if (authError) throw authError;

    // Create staff record
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert([
        {
          id: authData.user?.id,
          name,
          email,
          role,
          active: true
        }
      ])
      .select()
      .single();

    if (staffError) throw staffError;

    return { user: authData.user, staff: staffData };
  } catch (error) {
    console.error('Error creating staff user:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (staffError || !staff) return null;

    return {
      ...session.user,
      role: staff.role,
      name: staff.name,
      permissions: ROLE_PERMISSIONS[staff.role as keyof typeof ROLE_PERMISSIONS] || []
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const hasPermission = (permission: string): boolean => {
  const role = localStorage.getItem('staffRole');
  if (!role) return false;
  
  // Admin has access to everything
  if (role === 'admin') return true;
  
  // For other roles, check specific permissions
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.includes(permission) || false;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('staffRole') && !!localStorage.getItem('staffId');
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  password?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  product_count?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string;
  supplier_id: string;
  unit_price: number;
  current_stock: number;
  reorder_point: number;
  rop: number; // calculated
  eoq: number; // calculated
  adu: number; // average daily usage
  velocity: 'fast' | 'moderate' | 'slow';
  lead_time_days: number;
  safety_stock: number;
  cost_per_order: number;
  holding_cost: number;
  storage_location: string;
  unit_of_measure: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  category?: Category;
  supplier?: Supplier;
  category_name?: string;
  supplier_name?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  notes: string;
  reference_number: string;
  movement_date: string;
  performed_by_name: string;
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'slow_moving' | 'out_of_stock';
  message: string;
  product_id: string;
  product_name: string;
  severity: 'critical' | 'warning';
  is_acknowledged: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  errors?: Record<string, string[]>;
}

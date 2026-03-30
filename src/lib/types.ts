export interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  status: 'pending' | 'approved' | 'denied';
  swish_reference: string;
  created_at: string;
  notes?: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason?: string;
  created_at: string;
}

import { create } from 'zustand';

export interface Truck {
  id: number;
  license: string;
  sequence: string;
  bayan: string;
  status: 'Ready' | 'In Transit' | 'Booked';
}

export interface Account {
  id: number;
  username: string;
  status: 'Active' | 'Requires OTP' | 'Disconnected';
}

interface FasahStore {
  trucks: Truck[];
  accounts: Account[];
  addTruck: (truck: Omit<Truck, 'id' | 'status'>) => void;
  updateTruckStatus: (id: number, status: 'Ready' | 'In Transit' | 'Booked') => void;
  addAccount: (username: string) => void;
  removeAccount: (id: number) => void;
}

export const useStore = create<FasahStore>((set) => ({
  trucks: [
    { id: 1, license: '1234567890', sequence: '8877665544', bayan: '1000000001', status: 'Ready' },
    { id: 2, license: '0987654321', sequence: '1122334455', bayan: '1000000002', status: 'In Transit' },
  ],
  accounts: [
    { id: 1, username: 'logistics_admin_1', status: 'Active' },
  ],
  addTruck: (truckData) => set((state) => ({
    trucks: [
      { ...truckData, id: Date.now(), status: 'Ready' },
      ...state.trucks,
    ],
  })),
  updateTruckStatus: (id, status) => set((state) => ({
    trucks: state.trucks.map(t => t.id === id ? { ...t, status } : t)
  })),
  addAccount: (username) => set((state) => ({
    accounts: [
      ...state.accounts,
      { id: Date.now(), username, status: 'Disconnected' }
    ]
  })),
  removeAccount: (id) => set((state) => ({
    accounts: state.accounts.filter(acc => acc.id !== id)
  }))
}));

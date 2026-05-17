import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useStore = create<FasahStore>()(
  persist(
    (set) => ({
      trucks: [],
      accounts: [],
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
    }),
    {
      name: 'super-fasah-storage',
    }
  )
);

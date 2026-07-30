import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

export const PickupStationsTab: React.FC = () => {
  const [pickupSearch, setPickupSearch] = useState('');
  const [selectedPickupCounty, setSelectedPickupCounty] = useState('All');

  const pickupStations = [
    { county: 'Kisumu', name: 'Obotte Road Depot & Hub', address: 'Kisumu CBD, Obotte Road near Port', hours: 'Mon-Sat: 7AM - 7PM' },
    { county: 'Kisumu', name: 'Kondele Plaza Pickup Point', address: 'Kondele Highway Bypass Complex', hours: 'Mon-Sat: 8AM - 6PM' },
    { county: 'Nairobi', name: 'Tom Mboya Central Locker', address: 'Nairobi CBD, Tom Mboya Street, Pioneer House', hours: 'Mon-Sun: 24 Hours' },
    { county: 'Nairobi', name: 'Westlands Square Trade Station', address: 'Westlands Mall basement level 1', hours: 'Mon-Sat: 8AM - 8PM' },
    { county: 'Mombasa', name: 'Mombasa Ganjoni Partner Depot', address: 'Archbishop Makarios Road near terminal', hours: 'Mon-Sat: 7:30AM - 6:30PM' },
    { county: 'Nakuru', name: 'Nakuru KFA Roundabout Office', address: 'George Morara Avenue next to Shell', hours: 'Mon-Sat: 8AM - 5PM' },
    { county: 'Kiambu', name: 'Thika Highway Lockers', address: 'Thika CBD near Juja Exit Mall', hours: 'Mon-Sun: 8AM - 9PM' }
  ];

  const filteredStations = pickupStations.filter(station => {
    const query = pickupSearch.toLowerCase();
    const countyMatch = selectedPickupCounty === 'All' || station.county === selectedPickupCounty;
    const searchMatch = station.name.toLowerCase().includes(query) || station.address.toLowerCase().includes(query);
    return countyMatch && searchMatch;
  });

  return (
    <div className="space-y-4">
      <p>
        Drop off return equipment, pick up ordered spare parts, or inspect material samples at Kazify County Depots.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search station name or street..." 
            value={pickupSearch}
            onChange={e => setPickupSearch(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white"
          />
        </div>
        <select 
          value={selectedPickupCounty} 
          onChange={e => setSelectedPickupCounty(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs dark:text-white"
        >
          <option value="All">All Counties</option>
          <option value="Kisumu">Kisumu</option>
          <option value="Nairobi">Nairobi</option>
          <option value="Mombasa">Mombasa</option>
          <option value="Nakuru">Nakuru</option>
          <option value="Kiambu">Kiambu</option>
        </select>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredStations.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No pickup stations found matching your search.</div>
        ) : (
          filteredStations.map((station, i) => (
            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-start">
              <div>
                <span className="font-bold block text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  {station.name}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{station.address}</p>
                <span className="text-[10px] text-orange-500 font-mono mt-1 block">{station.hours}</span>
              </div>
              <span className="bg-orange-500/10 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {station.county}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

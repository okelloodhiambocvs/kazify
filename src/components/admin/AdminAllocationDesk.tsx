import React from 'react';
import { RefreshCw, Navigation, X } from 'lucide-react';

interface AdminAllocationDeskProps {
  jobsList: any[];
  loadingJobs: boolean;
  selectedAllocationJob: any | null;
  setSelectedAllocationJob: (job: any | null) => void;
  recommendations: any[];
  loadingRecommendations: boolean;
  isAllocating: boolean;
  allocationMessage: string;
  setAllocationMessage: (msg: string) => void;
  allocationSearch: string;
  setAllocationSearch: (search: string) => void;
  isAllocationModalOpen: boolean;
  setIsAllocationModalOpen: (open: boolean) => void;
  isBulkModalOpen: boolean;
  setIsBulkModalOpen: (open: boolean) => void;
  bulkRecommendations: any[];
  setBulkRecommendations: React.Dispatch<React.SetStateAction<any[]>>;
  loadingBulkRecommendations: boolean;
  bulkAllocationMessage: string;
  isBulkAllocating: boolean;
  calculateGeodeticDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  fetchAllocationsJobs: () => void;
  handleAllocate: (jobId: string, fundiId: string) => void;
  handleBulkAllocate: () => void;
}

export default function AdminAllocationDesk({
  jobsList,
  loadingJobs,
  selectedAllocationJob,
  setSelectedAllocationJob,
  recommendations,
  loadingRecommendations,
  isAllocating,
  allocationMessage,
  setAllocationMessage,
  allocationSearch,
  setAllocationSearch,
  isAllocationModalOpen,
  setIsAllocationModalOpen,
  isBulkModalOpen,
  setIsBulkModalOpen,
  bulkRecommendations,
  setBulkRecommendations,
  loadingBulkRecommendations,
  bulkAllocationMessage,
  isBulkAllocating,
  calculateGeodeticDistance,
  fetchAllocationsJobs,
  handleAllocate,
  handleBulkAllocate
}: AdminAllocationDeskProps) {
  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-150 text-left">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Kazify Dispatch & Allocation Desk</h2>
          <p className="text-xs text-slate-400">Match client requests with the nearest, highly reliable tradespersons based on proximity, ratings, and active trade skills.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Service Requests List */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">Active Service Requests</h3>
              <button 
                onClick={fetchAllocationsJobs}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition font-mono"
              >
                <RefreshCw className={`w-3 h-3 ${loadingJobs ? 'animate-spin' : ''}`} />
                SYNC LIST
              </button>
            </div>

            {/* Search filter */}
            <div>
              <input 
                type="text"
                placeholder="Filter by title, client, or category..."
                value={allocationSearch}
                onChange={(e) => setAllocationSearch(e.target.value)}
                aria-label="Filter active service requests list"
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500"
              />
            </div>

            {loadingJobs ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {jobsList.filter(job => {
                  const searchLower = allocationSearch.toLowerCase();
                  return (
                    job.title?.toLowerCase().includes(searchLower) ||
                    job.category?.toLowerCase().includes(searchLower) ||
                    job.customer_name?.toLowerCase().includes(searchLower)
                  );
                }).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-600 font-mono">
                    No matching active requests found.
                  </div>
                ) : (
                  jobsList.filter(job => {
                    const searchLower = allocationSearch.toLowerCase();
                    return (
                      job.title?.toLowerCase().includes(searchLower) ||
                      job.category?.toLowerCase().includes(searchLower) ||
                      job.customer_name?.toLowerCase().includes(searchLower)
                    );
                  }).map((job) => {
                    const isAssigned = !!job.fundi_id;
                    const isSelected = selectedAllocationJob?.id === job.id;

                    return (
                      <div 
                        key={job.id}
                        onClick={() => {
                          setSelectedAllocationJob(job);
                          setAllocationMessage('');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                          isSelected 
                            ? 'bg-slate-900 border-orange-500' 
                            : 'bg-slate-950 hover:bg-slate-900/50 border-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-semibold text-white truncate max-w-[180px]">{job.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border bg-slate-900 border-slate-800 text-slate-400">
                            {job.category}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 truncate leading-snug">{job.description}</p>

                        <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                          <span className="text-slate-500">Client: {job.customer_name}</span>
                          <span className="text-emerald-400 font-semibold">KES {(job.amount || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-slate-900">
                          <span className="text-slate-500">Style: {job.workflow?.toUpperCase()}</span>
                          {isAssigned ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                              ASSIGNED
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              UNASSIGNED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Side: Proximity Matching Engine */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[400px]">
            {selectedAllocationJob ? (
              <div className="space-y-6 text-left">
                <div className="border-b border-slate-900 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">REQUEST ID: {selectedAllocationJob.id}</span>
                      <h3 className="font-display font-bold text-lg text-white mt-0.5">{selectedAllocationJob.title}</h3>
                    </div>
                    <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded font-mono font-bold uppercase">
                      {selectedAllocationJob.status?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedAllocationJob.description}</p>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Client Coordinates</span>
                      <span>Lat: {selectedAllocationJob.lat?.toFixed(5)} | Lng: {selectedAllocationJob.lng?.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Service Address</span>
                      <span className="truncate block" title={selectedAllocationJob.address}>{selectedAllocationJob.address}</span>
                    </div>
                  </div>
                </div>

                {/* Matching Recommendations list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">Spatial & Reliability Matches</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Sorted by Distance</span>
                  </div>

                  {allocationMessage && (
                    <div className={`p-3 rounded-xl border text-xs font-mono ${
                      allocationMessage.includes('Successfully') || allocationMessage.includes('allocated')
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {allocationMessage}
                    </div>
                  )}

                  {loadingRecommendations ? (
                    <div className="py-12 flex justify-center items-center">
                      <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mr-2" />
                      <span className="text-xs text-slate-400 font-mono">Calculating geodetic distances...</span>
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-600 font-mono border border-dashed border-slate-900 rounded-2xl">
                      No available tradespersons registered in the "{selectedAllocationJob.category}" category.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {recommendations.map((fundi: any) => {
                        const isCurrentAllocated = selectedAllocationJob.fundi_id === fundi.id;

                        return (
                          <div 
                            key={fundi.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isCurrentAllocated 
                                ? 'bg-emerald-500/5 border-emerald-500/30' 
                                : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80'
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs text-white block truncate">{fundi.name}</strong>
                                {fundi.isReliable && (
                                  <span className="text-[8px] bg-green-500/15 text-green-400 border border-green-500/20 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                                    RELIABLE ⭐
                                  </span>
                                )}
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                                  fundi.status === 'available' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                                }`}>
                                  {fundi.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                                <span className="flex items-center gap-1 text-orange-400 font-bold">
                                  ★ {fundi.rating?.toFixed(1) || '5.0'}
                                </span>
                                <span className="text-slate-500">|</span>
                                <span className="text-blue-400 font-semibold">
                                  📍 ~{fundi.distanceKM} KM away
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                Address: {fundi.address}
                              </div>
                            </div>

                            <div className="self-end md:self-center">
                              {isCurrentAllocated ? (
                                <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl block text-center">
                                  CURRENT ALLOCATION
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAllocate(selectedAllocationJob.id, fundi.id)}
                                  disabled={isAllocating}
                                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 text-center block whitespace-nowrap animate-in fade-in"
                                >
                                  {isAllocating ? 'ALLOCATING...' : 'ALLOCATE EXPERT'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-lg animate-bounce">
                  🛰️
                </div>
                <h3 className="font-display font-bold text-sm text-slate-300">Spatial Proximity Matching</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-normal">Select an active client request from the left list to fetch nearby available experts, calculate geodetic distances, and allocate.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation-based Allocation Modal */}
      {isAllocationModalOpen && selectedAllocationJob && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                  <Navigation className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">Manual Dispatch Desk</span>
                  <h3 className="font-display font-bold text-base text-white">Allocate Expert Tradesperson</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsAllocationModalOpen(false)}
                className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-left">
              {/* Job Details Card */}
              <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-orange-400 font-bold uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      {selectedAllocationJob.category}
                    </span>
                    <h4 className="font-display font-bold text-sm text-white mt-1.5">{selectedAllocationJob.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedAllocationJob.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block font-bold">BUDGET</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">KES {(selectedAllocationJob.amount || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Service Address</span>
                    <span className="truncate block text-slate-300" title={selectedAllocationJob.address}>📍 {selectedAllocationJob.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Client Coordinates</span>
                    <span className="text-slate-300">Lat: {selectedAllocationJob.lat?.toFixed(5)} | Lng: {selectedAllocationJob.lng?.toFixed(5)}</span>
                  </div>
                </div>
              </div>

              {/* Proximity Matching Results */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest">Nearby Available Experts</span>
                  <span className="text-[10px] text-orange-400 font-mono font-bold">Dynamic Geodetic Sorting</span>
                </div>

                {allocationMessage && (
                  <div className={`p-3.5 rounded-xl border text-xs font-mono animate-in slide-in-from-top-2 duration-150 ${
                    allocationMessage.includes('Successfully') || allocationMessage.includes('allocated')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {allocationMessage}
                  </div>
                )}

                {loadingRecommendations ? (
                  <div className="py-12 flex flex-col justify-center items-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                    <span className="text-xs text-slate-500 font-mono">Re-indexing regional satellite coordinates...</span>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-2xl">
                    No available tradespersons registered in "{selectedAllocationJob.category}" category.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {(() => {
                      const sortedFundis = [...recommendations].sort((a, b) => {
                        const fLatA = a.lat !== undefined ? a.lat : (a.location?.lat !== undefined ? a.location.lat : -1.286389);
                        const fLngA = a.lng !== undefined ? a.lng : (a.location?.lng !== undefined ? a.location.lng : 36.817223);
                        const fLatB = b.lat !== undefined ? b.lat : (b.location?.lat !== undefined ? b.location.lat : -1.286389);
                        const fLngB = b.lng !== undefined ? b.lng : (b.location?.lng !== undefined ? b.location.lng : 36.817223);

                        const distA = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLatA, fLngA);
                        const distB = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLatB, fLngB);
                        
                        const statusA = a.status || 'available';
                        const statusB = b.status || 'available';
                        if (statusA === 'available' && statusB !== 'available') return -1;
                        if (statusA !== 'available' && statusB === 'available') return 1;
                        
                        if (Math.abs(distA - distB) > 0.01) {
                          return distA - distB;
                        }
                        
                        return (b.rating || 5) - (a.rating || 5);
                      });

                      return sortedFundis.map((fundi: any) => {
                        const fLat = fundi.lat !== undefined ? fundi.lat : (fundi.location?.lat !== undefined ? fundi.location.lat : -1.286389);
                        const fLng = fundi.lng !== undefined ? fundi.lng : (fundi.location?.lng !== undefined ? fundi.location.lng : 36.817223);
                        const calculatedDist = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLat, fLng);
                        const isCurrentAllocated = selectedAllocationJob.fundi_id === fundi.id;

                        return (
                          <div 
                            key={fundi.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              isCurrentAllocated 
                                ? 'bg-emerald-500/5 border-emerald-500/30' 
                                : 'bg-slate-900 border-slate-850 hover:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs text-white block truncate">{fundi.name}</strong>
                                <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase border ${
                                  fundi.status === 'available' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                                }`}>
                                  {fundi.status || 'available'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                                <span className="text-orange-400 font-bold">★ {fundi.rating?.toFixed(1) || '5.0'}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-blue-400 font-semibold flex items-center gap-1">📍 {calculatedDist} KM away</span>
                              </div>
                            </div>

                            <div>
                              {isCurrentAllocated ? (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                                  ASSIGNED
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await handleAllocate(selectedAllocationJob.id, fundi.id);
                                  }}
                                  disabled={isAllocating}
                                  className="px-3 py-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-[10px] uppercase rounded-lg transition cursor-pointer"
                                >
                                  {isAllocating ? 'Assigning...' : 'Assign'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>* Assignment automatically generates a smart escrow lock contract.</span>
              <button 
                onClick={() => setIsAllocationModalOpen(false)}
                className="text-slate-400 hover:text-white transition font-bold"
              >
                CLOSE DESK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Allocation & Tradesperson Recommendation Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-900/20">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400">
                  <Navigation className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-white">Bulk Job Allocation & Geo-Matching</h2>
                  <p className="text-xs text-slate-400 font-mono">Haversine distance spatial optimization for selected jobs</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {bulkAllocationMessage && (
                <div className={`p-4 rounded-xl text-xs font-mono border ${
                  bulkAllocationMessage.includes('Successfully') || bulkAllocationMessage.includes('completed')
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {bulkAllocationMessage}
                </div>
              )}

              {loadingBulkRecommendations ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-mono text-slate-400">Calculating Haversine distance spatial coordinates for tradespeople...</p>
                </div>
              ) : bulkRecommendations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  No jobs selected or recommendations unavailable.
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkRecommendations.map((rec, idx) => (
                    <div key={rec.jobId} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">Job #{rec.jobId.substr(-6)} • {rec.jobCategory}</span>
                          <h4 className="text-sm font-bold text-white">{rec.jobTitle}</h4>
                          <p className="text-[11px] font-mono text-slate-400">Location: {rec.address || 'Nairobi Area'} • Budget: KES {(rec.budget || 0).toLocaleString()}</p>
                        </div>
                        {rec.currentFundiName && (
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                            Currently: {rec.currentFundiName}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
                          Suggested Tradesperson (Sorted by Distance & Rating)
                        </label>
                        {rec.allCandidates && rec.allCandidates.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rec.allCandidates.map((cand: any) => {
                              const isSelectedCandidate = rec.selectedCandidateId === cand.id;
                              return (
                                <div
                                  key={cand.id}
                                  onClick={() => {
                                    setBulkRecommendations(prev => prev.map(item => item.jobId === rec.jobId ? { ...item, selectedCandidateId: cand.id } : item));
                                  }}
                                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex justify-between items-center ${
                                    isSelectedCandidate
                                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md'
                                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="font-bold flex items-center gap-2">
                                      <span>{cand.name}</span>
                                      {cand.id === rec.bestCandidate?.id && (
                                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase">Best Match</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                                      <span className="text-orange-400">★ {cand.rating}</span>
                                      <span>📍 {cand.distanceKM} KM</span>
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelectedCandidate ? 'border-orange-500 bg-orange-500' : 'border-slate-700'
                                  }`}>
                                    {isSelectedCandidate && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                            No tradespeople registered for category "{rec.jobCategory}".
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-slate-900 flex justify-between items-center">
              <span className="text-xs font-mono text-slate-400">
                {bulkRecommendations.filter(r => r.selectedCandidateId).length} of {bulkRecommendations.length} ready for allocation
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAllocate}
                  disabled={isBulkAllocating || loadingBulkRecommendations || bulkRecommendations.filter(r => r.selectedCandidateId).length === 0}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs uppercase rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  {isBulkAllocating ? 'Allocating Jobs...' : 'Confirm Bulk Allocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

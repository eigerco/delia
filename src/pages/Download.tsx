import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useCtx } from "../GlobalCtx";
import { DownloadButton } from "../components/buttons/DownloadButton";

export function Download({
  // account,
}: {
  // account: InjectedAccountWithMeta;
}) {
  const [carId, setCarId] = useState<string>("bafkreiechz74drg7tg5zswmxf4g2dnwhemlwdv7e3l5ypehdqdwaoyz3dy");
  const [providerMultiaddr, setProviderMultiaddr] = useState<string>("/ip4/127.0.0.1/tcp/8003/ws");
  const [loading, setLoading] = useState(false);
  
  const ctx = useCtx();
  
  const downloadCar = async () => {    
    if (!carId.trim()) {
      toast.error("CAR ID is required");
      return;
    }
    
    try {
      setLoading(true);
      // TODO: Implement actual download logic
      toast.success(`Downloading file`);
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during download");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const isDownloadDisabled = !carId.trim() || loading;
  
  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-xl font-bold mb-4">Download CAR</h2>
        <div className="mb-4">
          <label htmlFor="car-id" className="block text-sm font-medium text-gray-700 mb-1">
            Payload CID
          </label>
          <input
            id="car-id"
            type="text"
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="provider-multiaddr-id" className="block text-sm font-medium text-gray-700 mb-1">
            Provider
          </label>
          <input
            id="provider-multiaddr-id"
            type="text"
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            value={providerMultiaddr}
            onChange={(e) => setProviderMultiaddr(e.target.value)}
          />
        </div>
        
        <div className="mt-6">
          <DownloadButton
            onClick={downloadCar}
            disabled={isDownloadDisabled}
            text={loading ? "Downloading..." : "Download"}
          />
        </div>
      </div>
      <Toaster position="bottom-right" reverseOrder={true} />
    </>
  );
}
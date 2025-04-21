import { getIframeConfigForBot } from "@/lib/queries/cached-queries";
import { IframeWrapper } from "@/app/components/iframe/wrapper";

interface Params {
  searchParams: Promise<{
    botId?: string;
  }>;
}

export default async function IframePage({ searchParams }: Params) {
  const { botId } = await searchParams;

  if (!botId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error: No Bot ID Provided</h1>
          <p className="text-gray-500 mt-2">
            Please include a botId parameter in the URL.
          </p>
        </div>
      </div>
    );
  }

  let config = {};
  try {
    const response = await getIframeConfigForBot(botId);
    if (response.success && response.data) {
      config = response.data;
    }
  } catch (error) {
    console.error("Error fetching iframe config:", error);
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <IframeWrapper botId={botId} config={config} />
    </div>
  );
}

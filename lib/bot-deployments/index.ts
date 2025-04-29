// import iframeDeployment from "./iframe/config";

// export const deployments = [iframeDeployment];

// export * from "./processor";
// export * from "./slack";

import slackDeployment from "./slack/config";
import iframeDeployment from "./iframe/config";
import gohighlevelDeployment from "./gohighlevel/config";
import dynamic from "next/dynamic";

// Create dynamic imports for logos to be used on the client side
export const deploymentLogos = {
  slack: dynamic(() =>
    import("./slack/assets/logo").then((mod) => ({ default: mod.Logo }))
  ),
  iframe: dynamic(() =>
    import("./iframe/assets/logo").then((mod) => ({ default: mod.Logo }))
  ),
  gohighlevel: dynamic(() =>
    import("./gohighlevel/assets/logo").then((mod) => ({ default: mod.Logo }))
  ),
};

export const deployments = [
  iframeDeployment,
  slackDeployment,
  gohighlevelDeployment,
];

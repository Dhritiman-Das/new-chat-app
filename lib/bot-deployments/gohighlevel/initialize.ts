export const onInitialize = async () => {
  // Get the state from sessionStorage if available
  const state =
    typeof window !== "undefined"
      ? sessionStorage.getItem("ghlOAuthState")
      : null;

  // Call the API endpoint to get the install URL
  const response = await fetch(
    "/api/apps/gohighlevel/install-url" + (state ? `?state=${state}` : "")
  ).then((res) => res.json());

  const { url } = response;

  const width = 600;
  const height = 800;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2.5;

  const popup = window.open(
    url,
    "",
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
  );

  // The popup might have been blocked, so we redirect the user to the URL instead
  if (!popup) {
    window.location.href = url;
    return;
  }

  const listener = (e: MessageEvent) => {
    if (e.data === "ghl_oauth_completed") {
      // Clear the state from sessionStorage when OAuth is completed
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ghlOAuthState");
      }

      window.location.reload();
      window.removeEventListener("message", listener);
      popup.close();
    }
  };

  window.addEventListener("message", listener);
};

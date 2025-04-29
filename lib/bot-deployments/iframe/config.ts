import image from "./assets/image.png";

export default {
  name: "Iframe",
  id: "iframe",
  category: "Assistant",
  active: true,
  destination: "/iframe",
  deploymentType: "WEBSITE",
  short_description:
    "Embed the application directly into websites or portals for seamless user access within existing interfaces.",
  description:
    "Iframe integration provides direct embedding capabilities, allowing users to interact with the app without leaving their current web environment. This maintains brand consistency while enabling core functionality through a secure, contained frame.",

  images: [image],
  settings: [], // Ignore this for now
};

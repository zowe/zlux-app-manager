import React from "react";
import { Section, AppCarouselList } from "../components/UI";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { useAppsCtx } from "../context/apps";

const Discover = () => {
  const { apps } = useAppsCtx();

  if (!apps) {
    // TODO: a nice loading spinner
    return <p>Loading...</p>;
  }

  const sections = [
    {
      id: 1,
      title: "Popular Apps",
      apps: apps,
    },
    {
      id: 2,
      title: "Recently Updated",
      apps: apps,
    },
    {
      id: 3,
      title: "New Releases",
      apps: apps,
    },
    {
      id: 4,
      title: "Most Downloaded",
      apps: apps,
    },
  ];

  return (
    <AppStoreLayout>
      {sections.map((section) => (
        <Section key={section.id} title={section.title}>
          <AppCarouselList apps={section.apps} />
        </Section>
      ))}
    </AppStoreLayout>
  );
};

export default Discover;

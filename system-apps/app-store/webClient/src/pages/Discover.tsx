import React from "react";
import { Section, AppCarouselList } from "../components/UI";
import { APPS } from "../constants";
import AppStoreLayout from '../components/AppStore/AppStoreLayout';

const sections = [
    {
        id: 1,
        title: "Popular Apps",
        apps: APPS
    },
    {
        id: 2,
        title: "Recently Updated",
        apps: APPS
    },
    {
        id: 3,
        title: "New Releases",
        apps: APPS
    },
    {
        id: 4,
        title: "Most Downloaded",
        apps: APPS
    }
]

const Discover = () => {
    return (
        <AppStoreLayout>
            {sections.map((section) => (
                <Section key={section.id} title={section.title}>
                    <AppCarouselList apps={section.apps} />
                </Section>
            ))}
        </AppStoreLayout>
    )
}

export default Discover;

import React, { useEffect } from "react";
import { AppCard, CustomNextArrow, CustomPrevArrow } from ".";
import { useWindowSize } from "../../context/window-size";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

const defaultSettings = {
  slidesToShow: 2,
  slidesToScroll: 1,
  prevArrow: <CustomPrevArrow />,
  nextArrow: <CustomNextArrow />,
};

type AppCarouselList = {
  apps: any[];
};

const AppCarouselList: React.FC<AppCarouselList> = ({ apps }) => {
  const windowSize = useWindowSize();
  const [settings, setSettings] = React.useState(defaultSettings);

  useEffect(() => {
    if (windowSize < 700) {
      setSettings({
        ...defaultSettings,
        slidesToShow: 1,
      });
    } else if (windowSize < 1000) {
      setSettings({
        ...defaultSettings,
        slidesToShow: 2,
      });
    } else if (windowSize < 1300) {
      setSettings({
        ...defaultSettings,
        slidesToShow: 3,
      });
    } else {
      setSettings({
        ...defaultSettings,
        slidesToShow: 4,
      });
    }
  }, [windowSize]);

  return (
    <div className={"appList"}>
      <Slider {...settings}>
        {apps.map((app) => (
          <AppCard
            key={app.id}
            id={app.id}
            name={app.name}
            description={app.description}
            icon={app.icon}
            publisher={app.publisher}
          />
        ))}
      </Slider>
    </div>
  );
};

export default AppCarouselList;

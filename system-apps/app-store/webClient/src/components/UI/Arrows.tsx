import React from 'react';
import { ASSETS_URL } from "../../constants";

const CustomNextArrow = (props) => {
    const { onClick } = props;
    return (
        <div
            onClick={onClick}
            className={`${'sliderArrow'} ${'nextArrow'}`}
        >
            <img src={ASSETS_URL + 'arrow-right.svg'} width={20} height={20} />
        </div>
    )
}

const CustomPrevArrow = (props) => {
    const { onClick } = props;
    return (
        <div
            onClick={onClick}
            className={`${'sliderArrow'} ${'prevArrow'}`}
        >
            <img src={ASSETS_URL + '/arrow-left.svg'} width={20} height={20} />
        </div>
    )
}

export {
    CustomNextArrow,
    CustomPrevArrow,
}

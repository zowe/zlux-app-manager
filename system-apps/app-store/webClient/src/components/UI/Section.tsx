import React from 'react';

type SectionProps = {
    title: string;
}

const Section: React.FC<SectionProps> = ({
    title,
    children
}) => {
    return (
        <div>
            <h2 style={{
                color: "whitesmoke",
                marginTop: "20px",
                fontWeight: 400,
                marginLeft: '40px'
            }}>{title}</h2>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "20px",
            }}>
                {children}
            </div>
        </div>
    )
}

export default Section;

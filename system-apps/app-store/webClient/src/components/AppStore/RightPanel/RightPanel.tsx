import React from "react";

const RightPanel: React.FC = ({
    children
}) => {
    return (
        <div style={{
            width: "100%",
            margin: "0 auto",
            overflowY: "scroll",
            paddingBottom: "40px",
            minHeight: "100vh",
        }}>
            {children}
        </div>
    )

}

export default RightPanel;

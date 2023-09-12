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
            borderLeft: "1px solid #333",
        }}>
            {children}
        </div>
    )

}

export default RightPanel;

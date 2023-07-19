import React, { createContext, useContext, useState } from 'react';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ReactMVDResources } from 'pluginlib/react-inject-resources';

type WindowSize = number; // contains the width of the window

const WindowSizeContext = createContext<WindowSize>(null);

export const useWindowSizeCtx = () => useContext(WindowSizeContext);

type WindowSizeProviderProps = {
    mvdResources: ReactMVDResources;
}

const WindowSizeProvider: React.FC<WindowSizeProviderProps> = ({ children, mvdResources }) => {
    const [windowSize, setWindowSize] = useState<number>(850); // initial window size

    (mvdResources.viewportEvents.resized as unknown as Subject<any>).pipe(debounceTime(100)).subscribe((e: {
        width: number;
        height: number;
    }) => {
        setWindowSize(e.width);
    });

    return (
        <WindowSizeContext.Provider value={windowSize}>
            {children}
        </WindowSizeContext.Provider>
    );
}

export const useWindowSize = () => useContext(WindowSizeContext);

export default WindowSizeProvider;

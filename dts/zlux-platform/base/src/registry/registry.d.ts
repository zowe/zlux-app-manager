import { Observable } from 'rxjs';
export declare abstract class ComponentFactory implements ZLUX.ComponentFactory {
    private capabilities;
    private componentClass;
    constructor(componentClass: ZLUX.ComponentClass, capabilities: ZLUX.Capability[]);
    getCapabilities(): ZLUX.Capability[];
    getClass(): ZLUX.ComponentClass;
    abstract instantiateIntoDOM(target: HTMLElement): Observable<ZLUX.IComponent>;
}
export declare class Registry implements ZLUX.Registry {
    private componentFactories;
    constructor();
    registerComponentFactory(factory: ZLUX.ComponentFactory): void;
    getComponentFactories(componentClass: ZLUX.ComponentClass, capabilities: ZLUX.Capability[]): ZLUX.ComponentFactory[];
}

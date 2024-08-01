import {
  CommonModule,
  NgIf,
  NgTemplateOutlet
} from "./chunk-JQLFQPSZ.js";
import {
  Component,
  ContentChild,
  Directive,
  EventEmitter,
  Input,
  NgModule,
  NgZone,
  Output,
  Renderer2,
  TemplateRef,
  ViewChild,
  setClassMetadata,
  timer,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpropertyInterpolate,
  ɵɵpureFunction1,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuery
} from "./chunk-CKHXSNZ6.js";
import "./chunk-YBMCURYQ.js";
import "./chunk-CX3I3NQG.js";

// node_modules/ngx-file-drop/fesm2022/ngx-file-drop.mjs
var _c0 = ["fileSelector"];
var _c1 = (a0) => ({
  openFileSelector: a0
});
function NgxFileDropComponent_ng_template_4_div_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 8);
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r1.dropZoneLabel);
  }
}
function NgxFileDropComponent_ng_template_4_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div")(1, "input", 9);
    ɵɵlistener("click", function NgxFileDropComponent_ng_template_4_div_1_Template_input_click_1_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.openFileSelector($event));
    });
    ɵɵelementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵpropertyInterpolate("value", ctx_r1.browseBtnLabel);
    ɵɵproperty("className", ctx_r1.browseBtnClassName);
  }
}
function NgxFileDropComponent_ng_template_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NgxFileDropComponent_ng_template_4_div_0_Template, 2, 1, "div", 6)(1, NgxFileDropComponent_ng_template_4_div_1_Template, 2, 2, "div", 7);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵproperty("ngIf", ctx_r1.dropZoneLabel);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.showBrowseBtn);
  }
}
function NgxFileDropComponent_ng_template_6_Template(rf, ctx) {
}
var NgxFileDropEntry = class {
  constructor(relativePath, fileEntry) {
    this.relativePath = relativePath;
    this.fileEntry = fileEntry;
  }
};
var _NgxFileDropContentTemplateDirective = class _NgxFileDropContentTemplateDirective {
  constructor(template) {
    this.template = template;
  }
};
_NgxFileDropContentTemplateDirective.ɵfac = function NgxFileDropContentTemplateDirective_Factory(t) {
  return new (t || _NgxFileDropContentTemplateDirective)(ɵɵdirectiveInject(TemplateRef));
};
_NgxFileDropContentTemplateDirective.ɵdir = ɵɵdefineDirective({
  type: _NgxFileDropContentTemplateDirective,
  selectors: [["", "ngx-file-drop-content-tmp", ""]]
});
var NgxFileDropContentTemplateDirective = _NgxFileDropContentTemplateDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxFileDropContentTemplateDirective, [{
    type: Directive,
    args: [{
      selector: "[ngx-file-drop-content-tmp]"
    }]
  }], function() {
    return [{
      type: TemplateRef
    }];
  }, null);
})();
var _NgxFileDropComponent = class _NgxFileDropComponent {
  get disabled() {
    return this._disabled;
  }
  set disabled(value) {
    this._disabled = value != null && `${value}` !== "false";
  }
  constructor(zone, renderer) {
    this.zone = zone;
    this.renderer = renderer;
    this.accept = "*";
    this.directory = false;
    this.multiple = true;
    this.dropZoneLabel = "";
    this.dropZoneClassName = "ngx-file-drop__drop-zone";
    this.useDragEnter = false;
    this.contentClassName = "ngx-file-drop__content";
    this.showBrowseBtn = false;
    this.browseBtnClassName = "btn btn-primary btn-xs ngx-file-drop__browse-btn";
    this.browseBtnLabel = "Browse files";
    this.onFileDrop = new EventEmitter();
    this.onFileOver = new EventEmitter();
    this.onFileLeave = new EventEmitter();
    this.isDraggingOverDropZone = false;
    this.globalDraggingInProgress = false;
    this.files = [];
    this.numOfActiveReadEntries = 0;
    this.helperFormEl = null;
    this.fileInputPlaceholderEl = null;
    this.dropEventTimerSubscription = null;
    this._disabled = false;
    this.openFileSelector = (event) => {
      if (this.fileSelector && this.fileSelector.nativeElement) {
        this.fileSelector.nativeElement.click();
      }
    };
    this.globalDragStartListener = this.renderer.listen("document", "dragstart", (evt) => {
      this.globalDraggingInProgress = true;
    });
    this.globalDragEndListener = this.renderer.listen("document", "dragend", (evt) => {
      this.globalDraggingInProgress = false;
    });
  }
  ngOnDestroy() {
    if (this.dropEventTimerSubscription) {
      this.dropEventTimerSubscription.unsubscribe();
      this.dropEventTimerSubscription = null;
    }
    this.globalDragStartListener();
    this.globalDragEndListener();
    this.files = [];
    this.helperFormEl = null;
    this.fileInputPlaceholderEl = null;
  }
  onDragOver(event) {
    if (this.useDragEnter) {
      this.preventAndStop(event);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    } else if (!this.isDropzoneDisabled() && !this.useDragEnter && event.dataTransfer) {
      if (!this.isDraggingOverDropZone) {
        this.isDraggingOverDropZone = true;
        this.onFileOver.emit(event);
      }
      this.preventAndStop(event);
      event.dataTransfer.dropEffect = "copy";
    }
  }
  onDragEnter(event) {
    if (!this.isDropzoneDisabled() && this.useDragEnter) {
      if (!this.isDraggingOverDropZone) {
        this.isDraggingOverDropZone = true;
        this.onFileOver.emit(event);
      }
      this.preventAndStop(event);
    }
  }
  onDragLeave(event) {
    if (!this.isDropzoneDisabled()) {
      if (this.isDraggingOverDropZone) {
        this.isDraggingOverDropZone = false;
        this.onFileLeave.emit(event);
      }
      this.preventAndStop(event);
    }
  }
  dropFiles(event) {
    if (this.isDropzoneDisabled()) {
      return;
    }
    this.isDraggingOverDropZone = false;
    if (event.dataTransfer) {
      let items;
      if (event.dataTransfer.items) {
        items = event.dataTransfer.items;
      } else {
        items = event.dataTransfer.files;
      }
      this.preventAndStop(event);
      this.checkFiles(items);
    }
  }
  /**
   * Processes the change event of the file input and adds the given files.
   * @param Event event
   */
  uploadFiles(event) {
    if (this.isDropzoneDisabled()) {
      return;
    }
    if (event.target) {
      const items = event.target.files || [];
      this.checkFiles(items);
      this.resetFileInput();
    }
  }
  getFakeDropEntry(file) {
    const fakeFileEntry = {
      name: file.name,
      isDirectory: false,
      isFile: true,
      file: (callback) => callback(file)
    };
    return new NgxFileDropEntry(fakeFileEntry.name, fakeFileEntry);
  }
  checkFile(item) {
    if (!item) {
      return;
    }
    if ("webkitGetAsEntry" in item) {
      let entry = item.webkitGetAsEntry();
      if (entry) {
        if (entry.isFile) {
          const toUpload = new NgxFileDropEntry(entry.name, entry);
          this.addToQueue(toUpload);
        } else if (entry.isDirectory) {
          this.traverseFileTree(entry, entry.name);
        }
        return;
      }
    }
    this.addToQueue(this.getFakeDropEntry(item));
  }
  checkFiles(items) {
    for (let i = 0; i < items.length; i++) {
      this.checkFile(items[i]);
    }
    if (this.dropEventTimerSubscription) {
      this.dropEventTimerSubscription.unsubscribe();
    }
    this.dropEventTimerSubscription = timer(200, 200).subscribe(() => {
      if (this.files.length > 0 && this.numOfActiveReadEntries === 0) {
        const files = this.files;
        this.files = [];
        this.onFileDrop.emit(files);
      }
    });
  }
  traverseFileTree(item, path) {
    if (item.isFile) {
      const toUpload = new NgxFileDropEntry(path, item);
      this.files.push(toUpload);
    } else {
      path = path + "/";
      const dirReader = item.createReader();
      let entries = [];
      const readEntries = () => {
        this.numOfActiveReadEntries++;
        dirReader.readEntries((result) => {
          if (!result.length) {
            if (entries.length === 0) {
              const toUpload = new NgxFileDropEntry(path, item);
              this.zone.run(() => {
                this.addToQueue(toUpload);
              });
            } else {
              for (let i = 0; i < entries.length; i++) {
                this.zone.run(() => {
                  this.traverseFileTree(entries[i], path + entries[i].name);
                });
              }
            }
          } else {
            entries = entries.concat(result);
            readEntries();
          }
          this.numOfActiveReadEntries--;
        });
      };
      readEntries();
    }
  }
  /**
   * Clears any added files from the file input element so the same file can subsequently be added multiple times.
   */
  resetFileInput() {
    if (this.fileSelector && this.fileSelector.nativeElement) {
      const fileInputEl = this.fileSelector.nativeElement;
      const fileInputContainerEl = fileInputEl.parentElement;
      const helperFormEl = this.getHelperFormElement();
      const fileInputPlaceholderEl = this.getFileInputPlaceholderElement();
      if (fileInputContainerEl !== helperFormEl) {
        this.renderer.insertBefore(fileInputContainerEl, fileInputPlaceholderEl, fileInputEl);
        this.renderer.appendChild(helperFormEl, fileInputEl);
        helperFormEl.reset();
        this.renderer.insertBefore(fileInputContainerEl, fileInputEl, fileInputPlaceholderEl);
        this.renderer.removeChild(fileInputContainerEl, fileInputPlaceholderEl);
      }
    }
  }
  /**
   * Get a cached HTML form element as a helper element to clear the file input element.
   */
  getHelperFormElement() {
    if (!this.helperFormEl) {
      this.helperFormEl = this.renderer.createElement("form");
    }
    return this.helperFormEl;
  }
  /**
   * Get a cached HTML div element to be used as placeholder for the file input element when clearing said element.
   */
  getFileInputPlaceholderElement() {
    if (!this.fileInputPlaceholderEl) {
      this.fileInputPlaceholderEl = this.renderer.createElement("div");
    }
    return this.fileInputPlaceholderEl;
  }
  isDropzoneDisabled() {
    return this.globalDraggingInProgress || this.disabled;
  }
  addToQueue(item) {
    this.files.push(item);
  }
  preventAndStop(event) {
    event.stopPropagation();
    event.preventDefault();
  }
};
_NgxFileDropComponent.ɵfac = function NgxFileDropComponent_Factory(t) {
  return new (t || _NgxFileDropComponent)(ɵɵdirectiveInject(NgZone), ɵɵdirectiveInject(Renderer2));
};
_NgxFileDropComponent.ɵcmp = ɵɵdefineComponent({
  type: _NgxFileDropComponent,
  selectors: [["ngx-file-drop"]],
  contentQueries: function NgxFileDropComponent_ContentQueries(rf, ctx, dirIndex) {
    if (rf & 1) {
      ɵɵcontentQuery(dirIndex, NgxFileDropContentTemplateDirective, 5, TemplateRef);
    }
    if (rf & 2) {
      let _t;
      ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.contentTemplate = _t.first);
    }
  },
  viewQuery: function NgxFileDropComponent_Query(rf, ctx) {
    if (rf & 1) {
      ɵɵviewQuery(_c0, 7);
    }
    if (rf & 2) {
      let _t;
      ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.fileSelector = _t.first);
    }
  },
  inputs: {
    accept: "accept",
    directory: "directory",
    multiple: "multiple",
    dropZoneLabel: "dropZoneLabel",
    dropZoneClassName: "dropZoneClassName",
    useDragEnter: "useDragEnter",
    contentClassName: "contentClassName",
    showBrowseBtn: "showBrowseBtn",
    browseBtnClassName: "browseBtnClassName",
    browseBtnLabel: "browseBtnLabel",
    disabled: "disabled"
  },
  outputs: {
    onFileDrop: "onFileDrop",
    onFileOver: "onFileOver",
    onFileLeave: "onFileLeave"
  },
  decls: 7,
  vars: 15,
  consts: [["fileSelector", ""], ["defaultContentTemplate", ""], [3, "drop", "dragover", "dragenter", "dragleave", "className"], [3, "className"], ["type", "file", 1, "ngx-file-drop__file-input", 3, "change", "accept", "multiple"], [3, "ngTemplateOutlet", "ngTemplateOutletContext"], ["class", "ngx-file-drop__drop-zone-label", 4, "ngIf"], [4, "ngIf"], [1, "ngx-file-drop__drop-zone-label"], ["type", "button", 3, "click", "className", "value"]],
  template: function NgxFileDropComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = ɵɵgetCurrentView();
      ɵɵelementStart(0, "div", 2);
      ɵɵlistener("drop", function NgxFileDropComponent_Template_div_drop_0_listener($event) {
        ɵɵrestoreView(_r1);
        return ɵɵresetView(ctx.dropFiles($event));
      })("dragover", function NgxFileDropComponent_Template_div_dragover_0_listener($event) {
        ɵɵrestoreView(_r1);
        return ɵɵresetView(ctx.onDragOver($event));
      })("dragenter", function NgxFileDropComponent_Template_div_dragenter_0_listener($event) {
        ɵɵrestoreView(_r1);
        return ɵɵresetView(ctx.onDragEnter($event));
      })("dragleave", function NgxFileDropComponent_Template_div_dragleave_0_listener($event) {
        ɵɵrestoreView(_r1);
        return ɵɵresetView(ctx.onDragLeave($event));
      });
      ɵɵelementStart(1, "div", 3)(2, "input", 4, 0);
      ɵɵlistener("change", function NgxFileDropComponent_Template_input_change_2_listener($event) {
        ɵɵrestoreView(_r1);
        return ɵɵresetView(ctx.uploadFiles($event));
      });
      ɵɵelementEnd();
      ɵɵtemplate(4, NgxFileDropComponent_ng_template_4_Template, 2, 2, "ng-template", null, 1, ɵɵtemplateRefExtractor)(6, NgxFileDropComponent_ng_template_6_Template, 0, 0, "ng-template", 5);
      ɵɵelementEnd()();
    }
    if (rf & 2) {
      const defaultContentTemplate_r4 = ɵɵreference(5);
      ɵɵclassProp("ngx-file-drop__drop-zone--over", ctx.isDraggingOverDropZone);
      ɵɵproperty("className", ctx.dropZoneClassName);
      ɵɵadvance();
      ɵɵproperty("className", ctx.contentClassName);
      ɵɵadvance();
      ɵɵproperty("accept", ctx.accept)("multiple", ctx.multiple);
      ɵɵattribute("directory", ctx.directory || void 0)("webkitdirectory", ctx.directory || void 0)("mozdirectory", ctx.directory || void 0)("msdirectory", ctx.directory || void 0)("odirectory", ctx.directory || void 0);
      ɵɵadvance(4);
      ɵɵproperty("ngTemplateOutlet", ctx.contentTemplate || defaultContentTemplate_r4)("ngTemplateOutletContext", ɵɵpureFunction1(13, _c1, ctx.openFileSelector));
    }
  },
  dependencies: [NgIf, NgTemplateOutlet],
  styles: [".ngx-file-drop__drop-zone[_ngcontent-%COMP%]{height:100px;margin:auto;border:2px dotted #0782d0;border-radius:30px}.ngx-file-drop__drop-zone--over[_ngcontent-%COMP%]{background-color:#93939380}.ngx-file-drop__content[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;height:100px;color:#0782d0}.ngx-file-drop__drop-zone-label[_ngcontent-%COMP%]{text-align:center}.ngx-file-drop__file-input[_ngcontent-%COMP%]{display:none}"]
});
var NgxFileDropComponent = _NgxFileDropComponent;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxFileDropComponent, [{
    type: Component,
    args: [{
      selector: "ngx-file-drop",
      template: '<div [className]="dropZoneClassName"\r\n     [class.ngx-file-drop__drop-zone--over]="isDraggingOverDropZone"\r\n     (drop)="dropFiles($event)"\r\n     (dragover)="onDragOver($event)"\r\n     (dragenter)="onDragEnter($event)"\r\n     (dragleave)="onDragLeave($event)">\r\n  <div [className]="contentClassName">\r\n    <input \r\n      type="file" \r\n      #fileSelector \r\n      [accept]="accept" \r\n      [attr.directory]="directory || undefined" \r\n      [attr.webkitdirectory]="directory || undefined"\r\n      [attr.mozdirectory]="directory || undefined"\r\n      [attr.msdirectory]="directory || undefined"\r\n      [attr.odirectory]="directory || undefined"\r\n      [multiple]="multiple"\r\n      (change)="uploadFiles($event)" \r\n      class="ngx-file-drop__file-input" \r\n    />\r\n\r\n    <ng-template #defaultContentTemplate>\r\n      <div *ngIf="dropZoneLabel" class="ngx-file-drop__drop-zone-label">{{dropZoneLabel}}</div>\r\n      <div *ngIf="showBrowseBtn">\r\n        <input type="button" [className]="browseBtnClassName" value="{{browseBtnLabel}}" (click)="openFileSelector($event)" />\r\n      </div>\r\n    </ng-template>\r\n\r\n    <ng-template\r\n      [ngTemplateOutlet]="contentTemplate || defaultContentTemplate"\r\n      [ngTemplateOutletContext]="{ openFileSelector: openFileSelector }">\r\n    </ng-template>\r\n  </div>\r\n</div>\r\n',
      styles: [".ngx-file-drop__drop-zone{height:100px;margin:auto;border:2px dotted #0782d0;border-radius:30px}.ngx-file-drop__drop-zone--over{background-color:#93939380}.ngx-file-drop__content{display:flex;align-items:center;justify-content:center;height:100px;color:#0782d0}.ngx-file-drop__drop-zone-label{text-align:center}.ngx-file-drop__file-input{display:none}\n"]
    }]
  }], function() {
    return [{
      type: NgZone
    }, {
      type: Renderer2
    }];
  }, {
    accept: [{
      type: Input
    }],
    directory: [{
      type: Input
    }],
    multiple: [{
      type: Input
    }],
    dropZoneLabel: [{
      type: Input
    }],
    dropZoneClassName: [{
      type: Input
    }],
    useDragEnter: [{
      type: Input
    }],
    contentClassName: [{
      type: Input
    }],
    showBrowseBtn: [{
      type: Input
    }],
    browseBtnClassName: [{
      type: Input
    }],
    browseBtnLabel: [{
      type: Input
    }],
    onFileDrop: [{
      type: Output
    }],
    onFileOver: [{
      type: Output
    }],
    onFileLeave: [{
      type: Output
    }],
    contentTemplate: [{
      type: ContentChild,
      args: [NgxFileDropContentTemplateDirective, {
        read: TemplateRef
      }]
    }],
    fileSelector: [{
      type: ViewChild,
      args: ["fileSelector", {
        static: true
      }]
    }],
    disabled: [{
      type: Input
    }]
  });
})();
var _NgxFileDropModule = class _NgxFileDropModule {
};
_NgxFileDropModule.ɵfac = function NgxFileDropModule_Factory(t) {
  return new (t || _NgxFileDropModule)();
};
_NgxFileDropModule.ɵmod = ɵɵdefineNgModule({
  type: _NgxFileDropModule,
  bootstrap: [NgxFileDropComponent],
  declarations: [NgxFileDropComponent, NgxFileDropContentTemplateDirective],
  imports: [CommonModule],
  exports: [NgxFileDropComponent, NgxFileDropContentTemplateDirective]
});
_NgxFileDropModule.ɵinj = ɵɵdefineInjector({
  imports: [CommonModule]
});
var NgxFileDropModule = _NgxFileDropModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxFileDropModule, [{
    type: NgModule,
    args: [{
      declarations: [NgxFileDropComponent, NgxFileDropContentTemplateDirective],
      imports: [CommonModule],
      exports: [NgxFileDropComponent, NgxFileDropContentTemplateDirective],
      providers: [],
      bootstrap: [NgxFileDropComponent]
    }]
  }], null, null);
})();
export {
  NgxFileDropComponent,
  NgxFileDropContentTemplateDirective,
  NgxFileDropEntry,
  NgxFileDropModule
};
//# sourceMappingURL=ngx-file-drop.js.map

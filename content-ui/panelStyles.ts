const STYLE_ID = "bmc-jump-panel-style";

const STYLE_TEXT = `
.bmc-panel{position:absolute;z-index:10000;width:320px;max-height:78%;display:flex;flex-direction:column;
background:rgba(28,28,32,.96);color:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);
font:12px/1.6 -apple-system,"Microsoft YaHei",sans-serif;overflow:hidden;}
.bmc-panel[hidden]{display:none;}
.bmc-panel-head{display:flex;align-items:center;gap:4px;padding:8px;background:rgba(255,255,255,.06);
cursor:move;user-select:none;touch-action:none;}
.bmc-tab{border:0;background:transparent;color:rgba(255,255,255,.6);padding:2px 10px;border-radius:6px;
cursor:pointer;font-size:12px;}
.bmc-tab.is-active{background:rgba(251,114,153,.2);color:#fb7299;}
.bmc-close{margin-left:auto;border:0;background:transparent;color:rgba(255,255,255,.55);
font-size:16px;line-height:1;cursor:pointer;padding:0 4px;}
.bmc-close:hover{color:#fff;}
.bmc-body{padding:10px;overflow-y:auto;}
.bmc-section-head{display:flex;justify-content:space-between;color:rgba(255,255,255,.5);
font-size:11px;margin:10px 0 4px;}
.bmc-section-head:first-child{margin-top:0;}
.bmc-heading{display:inline-flex;align-items:center;min-width:0;}
.bmc-help{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
width:14px;height:14px;padding:0;border-radius:50%;
border:1px solid rgba(255,255,255,.4);background:transparent;color:rgba(255,255,255,.8);
font-size:10px;line-height:1;cursor:pointer;font-family:inherit;
flex:0 0 auto;margin-left:10px;}
.bmc-help:hover{background:rgba(255,255,255,.14);color:#fff;}
.bmc-help.is-hint{cursor:help;}
.bmc-seg{box-sizing:border-box;height:26px;display:flex;align-items:center;gap:6px;padding:4px 6px;
border-radius:6px;background:rgba(255,255,255,.05);cursor:pointer;margin-top:4px;white-space:nowrap;}
.bmc-seg.is-selected{box-shadow:inset 0 0 0 1px #fb7299;background:rgba(251,114,153,.12);}
/* 最多展示 5 行（5 × 26px + 4 × 4px 间距 = 146px），超出后列表内部滚动；
   padding 让内容避开滚动条与底边，scrollbar-gutter 预留滚动条位置，出现/消失时不抖动 */
.bmc-seg-list{margin-top:10px;display:flex;flex-direction:column;gap:4px;max-height:146px;
overflow-x:hidden;overflow-y:auto;overflow-anchor:none;padding-right:8px;padding-bottom:4px;
scrollbar-gutter:stable;}
.bmc-seg-list .bmc-seg{margin-top:0;}
/* Chrome / Edge 用固定宽度的经典滚动条，避免 overlay 滚动条在悬停时改变外观或占位 */
.bmc-seg-list::-webkit-scrollbar{width:6px;}
.bmc-seg-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:3px;}
.bmc-seg-list::-webkit-scrollbar-track{background:transparent;}
/* Firefox 只认标准属性，单独给一份，避免影响上面的 WebKit 滚动条 */
@supports (-moz-appearance:none) {
.bmc-seg-list{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.28) transparent;}
}
.bmc-seg-new{justify-content:center;color:#fb7299;margin-top:16px;}
.bmc-badge{flex:0 0 auto;font-size:10px;line-height:16px;padding:0 5px;border-radius:4px;
background:rgba(255,255,255,.12);color:rgba(255,255,255,.75);}
.bmc-badge.is-skip{background:rgba(251,114,153,.18);color:#fb7299;}
.bmc-badge.is-next{background:rgba(124,58,237,.25);color:#c4b5fd;}
.bmc-badge.is-api{background:rgba(88,166,255,.2);color:#7cc4ff;}
.bmc-kind{flex:0 0 auto;font-size:11px;color:#7cc4ff;font-weight:600;}
.bmc-time{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.75);font-size:11px;}
.bmc-empty{color:rgba(255,255,255,.35);padding:8px;text-align:center;}
.bmc-hint{color:rgba(255,255,255,.45);font-size:11px;line-height:1.5;margin-top:6px;}
.bmc-divider{height:1px;margin:14px 0 0;background:rgba(255,255,255,.12);}
.bmc-editor{display:flex;align-items:center;gap:4px;margin-top:6px;}
.bmc-editor input{flex:1;min-width:0;box-sizing:border-box;height:26px;padding:0 6px;
border-radius:6px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);
color:#fff;font-size:11px;outline:none;text-align:center;font-variant-numeric:tabular-nums;}
.bmc-editor input:focus{border-color:#fb7299;}
.bmc-editor input:disabled,.bmc-editor select:disabled{opacity:.55;cursor:default;}
.bmc-editor select{flex:0 0 72px;box-sizing:border-box;height:26px;border-radius:6px;
border:1px solid rgba(255,255,255,.15);background:#3a3a40;color:#fff;font-size:11px;outline:none;}
.bmc-import{box-sizing:border-box;width:100%;height:26px;border-radius:6px;
border:1px solid rgba(255,255,255,.15);background:#3a3a40;color:#fff;font-size:11px;outline:none;}
.bmc-actions{display:flex;gap:4px;margin-top:6px;}
.bmc-refresh{box-sizing:border-box;width:100%;height:26px;margin-top:8px;border-radius:6px;
border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;
font-size:11px;cursor:pointer;font-family:inherit;}
.bmc-refresh:hover{background:rgba(255,255,255,.16);}
.bmc-refresh:disabled{opacity:.55;cursor:default;}
.bmc-action{flex:1;box-sizing:border-box;height:24px;border:0;border-radius:6px;
background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:11px;cursor:pointer;
font-family:inherit;transition:background .15s;}
.bmc-action:hover{background:rgba(255,255,255,.18);}
.bmc-action.is-primary{background:#fb7299;color:#fff;}
.bmc-action.is-primary:hover{background:#f25d8b;}
.bmc-action.is-edit{background:#3b82f6;color:#fff;}
.bmc-action.is-edit:hover{background:#2f6fd0;}
.bmc-action:disabled{opacity:.45;cursor:default;}
.bmc-row-del{margin-left:auto;flex:0 0 auto;box-sizing:border-box;height:20px;padding:0 6px;
border:0;border-radius:4px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);
font-size:11px;line-height:20px;cursor:pointer;font-family:inherit;
transition:background .15s,color .15s;}
.bmc-row-del:hover{background:rgba(248,113,113,.22);color:#f87171;}
.bmc-input{box-sizing:border-box;width:100%;height:26px;padding:0 8px;border-radius:6px;
border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;
font-size:12px;outline:none;}
.bmc-input:focus{border-color:#fb7299;}
.bmc-submit{box-sizing:border-box;width:100%;height:30px;margin-top:10px;border:0;border-radius:6px;
background:#fb7299;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;
transition:background .15s;}
.bmc-submit:hover{background:#f25d8b;}
.bmc-submit:disabled{opacity:.55;cursor:default;}
.bmc-status{margin-top:8px;font-size:11px;line-height:1.5;min-height:16px;}
.bmc-section-head .bmc-status{margin:0;flex:1;min-height:0;text-align:center;
font-size:10px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bmc-footer{margin:0;padding:6px 10px;min-height:0;border-top:1px solid rgba(255,255,255,.08);}
`;

/** 手写 CSS：保持与原生命令式实现完全一致的视觉 */
export function ensurePanelStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.append(style);
}

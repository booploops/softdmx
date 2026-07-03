/**
 * Workspace definitions are stored in a WorkspaceFile, since they are written to far more often than the general configuration file.
 * Uses an efficient XML representation persisted to appdata/workspace.xml.
 * Layout data is serialized to proper nested XML (not opaque JSON-in-CDATA).
 */
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const PARSE_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
};

const BUILD_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
  suppressUnpairedNode: true,
};

export class WorkspaceFile {
  version: number = 1;
  outerLayout: unknown = null;
  workspaceLayouts: Record<string, unknown> = {};
  activeWorkspaceId: string = '';

  /**
   * Takes a JSON object and merges it with the current workspace file.
   * The incoming JSON object is assumed to be from an older or newer
   * version of the workspace file.
   */
  static fromJSON(jsonObject: Record<string, unknown>): WorkspaceFile {
    const workspaceFile = new WorkspaceFile();
    Object.assign(workspaceFile, jsonObject);
    return workspaceFile;
  }

  // ============================================================
  // Proper structured XML (no more opaque JSON-in-CDATA for layouts)
  // ============================================================

  /** Dockview JS layout object -> builder-friendly structured XML object */
  private static layoutToXmlObj(layout: any): any {
    if (!layout || typeof layout !== 'object') return layout;
    const out: any = {};

    if (layout.grid) {
      out.grid = this.gridToXml(layout.grid);
    }

    if (layout.panels && typeof layout.panels === 'object') {
      const panelArr = Object.entries(layout.panels).map(([id, p]) =>
        this.panelStateToXml(id, p as any)
      );
      out.panels = panelArr.length === 1 ? { panel: panelArr[0] } : { panel: panelArr };
    }

    if (layout.activeGroup != null) {
      out.activeGroup = layout.activeGroup;
    }

    // Preserve other top-level keys (edgeGroups etc.) if present by shallow copy
    // (they will be turned into elements; sufficient for most cases)
    for (const k of ['floatingGroups', 'popoutGroups', 'edgeGroups']) {
      if (k in layout && layout[k] != null) {
        out[k] = layout[k];
      }
    }

    return out;
  }

  private static gridToXml(grid: any): any {
    if (!grid) return undefined;
    const g: any = {};
    if (grid.width != null) g['@_width'] = grid.width;
    if (grid.height != null) g['@_height'] = grid.height;
    if (grid.orientation != null) g['@_orientation'] = grid.orientation;

    if (grid.root) {
      const rootNodeXml = this.serializedNodeToXml(grid.root);
      if (rootNodeXml) {
        g.root = { node: rootNodeXml };
      }
    }
    return g;
  }

  private static serializedNodeToXml(node: any): any {
    if (!node) return undefined;
    const n: any = { '@_type': node.type ?? 'leaf' };
    if (node.size != null) n['@_size'] = node.size;
    if (node.visible != null) n['@_visible'] = node.visible;

    if (node.type === 'leaf' && node.data) {
      n.data = this.groupViewStateToXml(node.data);
    } else if (node.type === 'branch' && Array.isArray(node.data)) {
      const kids = node.data
        .map((c: any) => this.serializedNodeToXml(c))
        .filter(Boolean);
      if (kids.length > 0) {
        n.node = kids.length === 1 ? kids[0] : kids;
      }
    }
    return n;
  }

  private static groupViewStateToXml(state: any): any {
    if (!state) return {};
    const d: any = { '@_id': state.id };
    if (state.activeView != null) d['@_activeView'] = state.activeView;
    if (Array.isArray(state.views) && state.views.length > 0) {
      d.views = { id: state.views };
    }
    for (const k of ['minimumWidth', 'minimumHeight', 'maximumWidth', 'maximumHeight']) {
      if ((state as any)[k] != null) d['@_' + k] = (state as any)[k];
    }
    return d;
  }

  private static panelStateToXml(id: string, state: any): any {
    const p: any = { '@_id': id ?? state?.id };
    if (state?.title != null) p['@_title'] = state.title;
    if (state?.contentComponent) p['@_contentComponent'] = state.contentComponent;
    if (state?.tabComponent) p['@_tabComponent'] = state.tabComponent;
    if (state?.renderer) p['@_renderer'] = state.renderer;
    for (const k of ['minimumWidth', 'minimumHeight', 'maximumWidth', 'maximumHeight']) {
      if ((state as any)?.[k] != null) p['@_' + k] = (state as any)[k];
    }
    if (state?.params && typeof state.params === 'object') {
      const entries = Object.entries(state.params).map(([key, val]) => ({
        '@_key': key,
        '#text': val == null ? '' : String(val),
      }));
      if (entries.length > 0) {
        p.params = entries.length === 1 ? { entry: entries[0] } : { entry: entries };
      }
    }
    return p;
  }

  /** Parsed XML object (from fast-xml-parser) -> original Dockview JS layout shape */
  private static xmlObjToLayout(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const layout: any = {};

    if (obj.grid) {
      layout.grid = this.xmlGridToJs(obj.grid);
    }
    if (obj.panels) {
      layout.panels = this.xmlPanelsToJs(obj.panels);
    }
    if (obj.activeGroup != null) {
      const ag = obj.activeGroup;
      layout.activeGroup = typeof ag === 'object' ? (ag['#text'] ?? ag) : ag;
    }
    // carry over other fields with proper type conversion
    if (obj.floatingGroups != null) {
      const arr = Array.isArray(obj.floatingGroups) ? obj.floatingGroups : [obj.floatingGroups];
      layout.floatingGroups = arr.map((item: any) => this.xmlFloatingGroupToJs(item));
    }
    if (obj.popoutGroups != null) {
      const arr = Array.isArray(obj.popoutGroups) ? obj.popoutGroups : [obj.popoutGroups];
      layout.popoutGroups = arr.map((item: any) => this.xmlPopoutGroupToJs(item));
    }
    if (obj.edgeGroups != null) {
      const arr = Array.isArray(obj.edgeGroups) ? obj.edgeGroups : [obj.edgeGroups];
      layout.edgeGroups = arr.map((item: any) => this.xmlEdgeGroupToJs(item));
    }
    return layout;
  }

  private static xmlGridToJs(g: any): any {
    if (!g) return null;
    const grid: any = {
      width: Number(g['@_width'] ?? g.width ?? 0),
      height: Number(g['@_height'] ?? g.height ?? 0),
      orientation: g['@_orientation'] ?? g.orientation ?? 'HORIZONTAL',
    };
    const rootSrc = g.root?.node ?? g.root ?? g.node;
    if (rootSrc) {
      grid.root = this.xmlNodeToJs(rootSrc);
    }
    return grid;
  }

  private static xmlNodeToJs(n: any): any {
    if (!n) return null;
    const node: any = {
      type: n['@_type'] ?? n.type ?? 'leaf',
    };
    const sz = n['@_size'] ?? n.size;
    if (sz != null) node.size = Number(sz);
    const vis = n['@_visible'] ?? n.visible;
    if (vis != null) node.visible = vis === true || vis === 'true';

    if (node.type === 'leaf') {
      const d = n.data ?? n['data'];
      if (d) node.data = this.xmlGroupViewToJs(d);
    } else if (node.type === 'branch') {
      let kids = n.node ?? n['node'];
      if (kids) {
        if (!Array.isArray(kids)) kids = [kids];
        node.data = kids.map((c: any) => this.xmlNodeToJs(c)).filter(Boolean);
      } else {
        node.data = [];
      }
    }
    return node;
  }

  private static xmlGroupViewToJs(d: any): any {
    if (!d) return {};
    const state: any = {
      id: d['@_id'] ?? d.id,
    };
    const av = d['@_activeView'] ?? d.activeView;
    if (av != null) state.activeView = av;

    let vsrc = d.views?.id ?? d.views;
    if (vsrc != null) {
      if (!Array.isArray(vsrc)) vsrc = [vsrc];
      state.views = vsrc.map((v: any) =>
        typeof v === 'object' ? (v['#text'] ?? v['@_id'] ?? String(v)) : String(v)
      );
    }

    for (const k of ['minimumWidth', 'minimumHeight', 'maximumWidth', 'maximumHeight']) {
      const val = d['@_' + k] ?? (d as any)[k];
      if (val != null) state[k] = Number(val);
    }
    return state;
  }

  private static xmlFloatingGroupToJs(fg: any): any {
    if (!fg || typeof fg !== 'object') return fg;
    const res: any = {};
    if (fg.data) {
      res.data = this.xmlGroupViewToJs(fg.data);
    }
    if (fg.position) {
      res.position = {
        x: fg.position.x != null ? Number(fg.position.x) : 0,
        y: fg.position.y != null ? Number(fg.position.y) : 0,
      };
    }
    if (fg.size) {
      res.size = {
        width: fg.size.width != null ? Number(fg.size.width) : 0,
        height: fg.size.height != null ? Number(fg.size.height) : 0,
      };
    }
    return res;
  }

  private static xmlPopoutGroupToJs(pg: any): any {
    if (!pg || typeof pg !== 'object') return pg;
    const res: any = {};
    if (pg.data) {
      res.data = this.xmlGroupViewToJs(pg.data);
    }
    if (pg.position) {
      res.position = {
        x: pg.position.x != null ? Number(pg.position.x) : 0,
        y: pg.position.y != null ? Number(pg.position.y) : 0,
      };
    }
    if (pg.size) {
      res.size = {
        width: pg.size.width != null ? Number(pg.size.width) : 0,
        height: pg.size.height != null ? Number(pg.size.height) : 0,
      };
    }
    for (const key of Object.keys(pg)) {
      if (key !== 'data' && key !== 'position' && key !== 'size') {
        res[key] = pg[key];
      }
    }
    return res;
  }

  private static xmlEdgeGroupToJs(eg: any): any {
    if (!eg || typeof eg !== 'object') return eg;
    const res: any = {};
    if (eg.data) {
      res.data = this.xmlGroupViewToJs(eg.data);
    }
    if (eg.size != null) {
      res.size = Number(eg.size);
    }
    for (const key of Object.keys(eg)) {
      if (key !== 'data' && key !== 'size') {
        res[key] = eg[key];
      }
    }
    return res;
  }

  private static xmlPanelsToJs(panelsContainer: any): Record<string, any> {
    const result: Record<string, any> = {};
    let list = panelsContainer?.panel ?? panelsContainer;
    if (!list) return result;
    if (!Array.isArray(list)) list = [list];

    for (const p of list) {
      if (!p) continue;
      const id = p['@_id'] ?? p.id;
      if (!id) continue;

      const state: any = { id };
      const title = p['@_title'] ?? p.title;
      if (title != null) state.title = title;
      const cc = p['@_contentComponent'] ?? p.contentComponent;
      if (cc != null) state.contentComponent = cc;
      const tc = p['@_tabComponent'] ?? p.tabComponent;
      if (tc != null) state.tabComponent = tc;
      const ren = p['@_renderer'] ?? p.renderer;
      if (ren != null) state.renderer = ren;

      for (const k of ['minimumWidth', 'minimumHeight', 'maximumWidth', 'maximumHeight']) {
        const v = p['@_' + k] ?? (p as any)[k];
        if (v != null) state[k] = Number(v);
      }

      const paramSrc = p.params?.entry ?? p.params;
      if (paramSrc) {
        const entries = Array.isArray(paramSrc) ? paramSrc : [paramSrc];
        state.params = {};
        for (const e of entries) {
          if (!e) continue;
          const key = e['@_key'] ?? e.key;
          if (key == null) continue;
          let val: any = e['#text'] ?? e.__cdata ?? e;
          if (typeof val === 'object' && val != null) val = val['#text'] ?? val;
          if (typeof val === 'string') {
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (val !== '' && !isNaN(Number(val))) val = Number(val);
          }
          state.params[key] = val;
        }
      }

      result[id] = state;
    }
    return result;
  }

  static fromXML(xmlString: string): WorkspaceFile {
    const workspaceFile = new WorkspaceFile();
    if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
      return workspaceFile;
    }

    try {
      const parser = new XMLParser(PARSE_OPTIONS);
      const parsed = parser.parse(xmlString);
      const root = parsed?.workspace ?? parsed;

      if (root) {
        const ver = root['@_version'] ?? root.version;
        if (ver != null) {
          workspaceFile.version = parseInt(String(ver), 10) || 1;
        }

        const awid = root.activeWorkspaceId;
        if (awid != null) {
          workspaceFile.activeWorkspaceId =
            typeof awid === 'object' ? String(awid['#text'] ?? awid.__cdata ?? '') : String(awid);
        }

        const ol = root.outerLayout;
        if (ol != null) {
          if (ol.__cdata || typeof ol === 'string' || ol['#text']) {
            // legacy CDATA / JSON blob support (for migration)
            let str = '';
            if (typeof ol === 'string') str = ol;
            else if (typeof ol === 'object') str = ol.__cdata ?? ol['#text'] ?? '';
            if (str) {
              try {
                workspaceFile.outerLayout = JSON.parse(str);
              } catch {
                workspaceFile.outerLayout = str;
              }
            }
          } else if (ol.grid || ol.panels) {
            workspaceFile.outerLayout = WorkspaceFile.xmlObjToLayout(ol);
          }
        }

        const wls = root.workspaceLayouts;
        if (wls != null) {
          const rawLayouts: any[] = [];
          const container = wls.layout ?? wls;
          if (Array.isArray(container)) {
            rawLayouts.push(...container);
          } else if (container != null) {
            rawLayouts.push(container);
          }

          const layouts: Record<string, unknown> = {};
          for (const item of rawLayouts) {
            if (!item) continue;
            const id = item['@_id'] ?? item.id ?? item['@_key'];
            if (!id) continue;

            let layoutData: any = null;
            if (item.__cdata || typeof item === 'string' || item['#text']) {
              // legacy
              let str = '';
              if (typeof item === 'string') str = item;
              else if (typeof item === 'object') str = item.__cdata ?? item['#text'] ?? '';
              if (str) {
                try {
                  layoutData = JSON.parse(str);
                } catch {
                  layoutData = str;
                }
              }
            } else if (item.grid || item.panels || item.node || item.data) {
              layoutData = WorkspaceFile.xmlObjToLayout(item);
            }
            if (layoutData != null) {
              layouts[String(id)] = layoutData;
            }
          }
          workspaceFile.workspaceLayouts = layouts;
        }
      }
    } catch (e) {
      console.error('Failed to parse workspace XML:', e);
    }

    return workspaceFile;
  }

  toXML(): string {
    const builder = new XMLBuilder(BUILD_OPTIONS);

    const layoutNodes: any[] = [];
    for (const [id, layout] of Object.entries(this.workspaceLayouts || {})) {
      if (layout == null) continue;
      const layoutXml = WorkspaceFile.layoutToXmlObj(layout);
      layoutNodes.push({
        '@_id': id,
        ...(layoutXml || {}),
      });
    }

    const obj: Record<string, any> = {
      workspace: {
        '@_version': this.version,
      },
    };

    if (this.activeWorkspaceId) {
      obj.workspace.activeWorkspaceId = this.activeWorkspaceId;
    }

    if (this.outerLayout != null) {
      const olXml = WorkspaceFile.layoutToXmlObj(this.outerLayout);
      if (olXml && Object.keys(olXml).length > 0) {
        obj.workspace.outerLayout = olXml;
      }
    }

    if (layoutNodes.length > 0) {
      obj.workspace.workspaceLayouts = {
        layout: layoutNodes.length === 1 ? layoutNodes[0] : layoutNodes,
      };
    }

    let xml = builder.build(obj);
    if (!xml.startsWith('<?xml')) {
      xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    }
    return xml;
  }
}

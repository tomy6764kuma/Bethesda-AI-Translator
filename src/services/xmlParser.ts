import { TranslationString, XmlParams } from '../types';

export interface ParseResult {
  params: XmlParams;
  items: TranslationString[];
}

export class XmlParser {
  /**
   * Parse xTranslator SSTXMLRessources XML string into structured objects
   */
  static parse(xmlContent: string): ParseResult {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML Parse Error: ${parseError.textContent}`);
    }

    const root = xmlDoc.querySelector('SSTXMLRessources');
    if (!root) {
      throw new Error('Invalid XML: Root element <SSTXMLRessources> not found.');
    }

    // Parse Params
    const paramsEl = root.querySelector('Params');
    const params: XmlParams = {
      addon: paramsEl?.querySelector('Addon')?.textContent || '',
      source: paramsEl?.querySelector('Source')?.textContent || 'en',
      dest: paramsEl?.querySelector('Dest')?.textContent || 'ja',
      version: paramsEl?.querySelector('Version')?.textContent || '2',
    };

    // Parse Content Strings
    const stringNodes = root.querySelectorAll('Content > String');
    const items: TranslationString[] = [];

    stringNodes.forEach((node, index) => {
      const edid = node.querySelector('EDID')?.textContent || '';
      const recNode = node.querySelector('REC');
      const rec = recNode?.textContent || '';
      const source = node.querySelector('Source')?.textContent || '';
      const dest = node.querySelector('Dest')?.textContent || '';
      const npc = node.querySelector('NPC')?.textContent || undefined;
      const sexRaw = node.querySelector('Sex')?.textContent;
      
      let sex: 'Male' | 'Female' | 'Unknown' = 'Unknown';
      if (sexRaw === 'Male') sex = 'Male';
      else if (sexRaw === 'Female') sex = 'Female';

      const isTranslated = dest.trim().length > 0 && dest !== source;

      items.push({
        id: `str_${index}_${Date.now()}`,
        edid,
        rec,
        source,
        dest,
        npc,
        sex,
        status: isTranslated ? 'translated' : 'untranslated',
      });
    });

    return { params, items };
  }

  /**
   * Generate xTranslator SSTXMLRessources XML string from structured objects
   */
  static generate(params: XmlParams, items: TranslationString[]): string {
    const doc = document.implementation.createDocument(null, 'SSTXMLRessources', null);
    const root = doc.documentElement;

    // Build Params
    const paramsEl = doc.createElement('Params');
    
    const addonEl = doc.createElement('Addon');
    addonEl.textContent = params.addon;
    paramsEl.appendChild(addonEl);

    const sourceEl = doc.createElement('Source');
    sourceEl.textContent = params.source;
    paramsEl.appendChild(sourceEl);

    const destEl = doc.createElement('Dest');
    destEl.textContent = params.dest;
    paramsEl.appendChild(destEl);

    const versionEl = doc.createElement('Version');
    versionEl.textContent = params.version;
    paramsEl.appendChild(versionEl);

    root.appendChild(paramsEl);

    // Build Content
    const contentEl = doc.createElement('Content');

    items.forEach((item) => {
      const stringEl = doc.createElement('String');
      stringEl.setAttribute('List', '2');

      const edidEl = doc.createElement('EDID');
      edidEl.textContent = item.edid;
      stringEl.appendChild(edidEl);

      const recEl = doc.createElement('REC');
      recEl.textContent = item.rec;
      stringEl.appendChild(recEl);

      const sourceEl = doc.createElement('Source');
      sourceEl.textContent = item.source;
      stringEl.appendChild(sourceEl);

      const destEl = doc.createElement('Dest');
      // Use AI suggested translation if current dest is empty, or keep modified dest
      destEl.textContent = item.dest || item.aiTranslation || '';
      stringEl.appendChild(destEl);

      if (item.npc) {
        const npcEl = doc.createElement('NPC');
        npcEl.textContent = item.npc;
        stringEl.appendChild(npcEl);
      }

      if (item.sex && item.sex !== 'Unknown') {
        const sexEl = doc.createElement('Sex');
        sexEl.textContent = item.sex;
        stringEl.appendChild(sexEl);
      }

      contentEl.appendChild(stringEl);
    });

    root.appendChild(contentEl);

    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(doc);

    // Add standard XML declaration
    xmlString = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xmlString;

    return xmlString;
  }
}

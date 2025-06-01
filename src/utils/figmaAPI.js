import axios from 'axios';

/**
 * Figma APIクライアントの設定
 */
const figmaClient = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: {
    'X-Figma-Token': import.meta.env.FIGMA_API_KEY
  }
});

/**
 * Figmaからデザインシステム情報を取得する
 * @returns {Promise<Object>} デザインシステム情報
 */
export async function getFigmaDesignSystem() {
  try {
    console.log('Figmaファイル情報を取得中...');
    console.log('Figma API Key:', import.meta.env.FIGMA_API_KEY ? '設定されています' : '未設定');
    console.log('Figma File ID:', import.meta.env.FIGMA_FILE_ID ? '設定されています' : '未設定');
    
    // ファイル全体の情報を取得
    const fileResponse = await figmaClient.get(`/files/${import.meta.env.FIGMA_FILE_ID}`);
    const fileData = fileResponse.data;
    
    console.log('Figmaファイル情報の取得成功');
    
    // スタイル情報を抽出
    const styles = fileData.styles || {};
    
    // 各スタイルタイプごとに情報を整理
    const colorStyles = {};
    const textStyles = {};
    const effectStyles = {};
    
    // スタイル情報をループして分類
    Object.entries(styles).forEach(([id, style]) => {
      // スタイルIDでノードを検索
      const nodes = findNodesWithStyleId(fileData.document, id);
      
      if (nodes.length > 0) {
        const node = nodes[0]; // 最初に見つかったノードを使用
        
        // スタイルタイプに応じて処理
        switch (style.styleType) {
          case 'FILL':
            if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
              const fill = node.fills[0];
              const { r, g, b, a = 1 } = fill.color;
              
              // RGB値をCSS用に変換
              colorStyles[style.name] = {
                rgba: `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`,
                hex: `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`
              };
            }
            break;
            
          case 'TEXT':
            if (node.style) {
              // テキストスタイル情報を取得
              const { fontFamily, fontWeight, fontSize, letterSpacing, lineHeight } = node.style;
              
              textStyles[style.name] = {
                fontFamily,
                fontWeight,
                fontSize: `${fontSize}px`,
                letterSpacing: letterSpacing !== 0 ? `${letterSpacing}px` : 'normal',
                lineHeight: typeof lineHeight === 'object' ? `${lineHeight.value}${lineHeight.unit}` : 'normal'
              };
            }
            break;
            
          case 'EFFECT':
            if (node.effects && node.effects.length > 0) {
              // エフェクト情報を取得
              effectStyles[style.name] = node.effects.map(effect => {
                if (effect.type === 'DROP_SHADOW') {
                  const { color, offset, radius } = effect;
                  return {
                    type: 'boxShadow',
                    value: `${offset.x}px ${offset.y}px ${radius}px rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`
                  };
                }
                return null;
              }).filter(Boolean);
            }
            break;
        }
      }
    });
    
    // 変数コレクションからスペーシング情報を取得
    const spacingValues = {};
    
    try {
      console.log('Figma変数情報を取得中...');
      const variablesResponse = await figmaClient.get(`/files/${import.meta.env.FIGMA_FILE_ID}/variables`);
      const variablesData = variablesResponse.data;
      console.log('Figma変数情報の取得成功');
      
      // 変数コレクションからスペーシング変数を抽出
      const collections = variablesData.meta.variableCollections || [];
      collections.forEach(collection => {
        if (collection.name.toLowerCase().includes('spacing')) {
          // この変数コレクションのすべての変数を調べる
          Object.entries(variablesData.variables || {}).forEach(([id, variable]) => {
            if (variable.variableCollectionId === collection.id) {
              // デフォルトモードの値を取得
              const defaultMode = Object.keys(collection.modes)[0];
              const value = variable.valuesByMode[defaultMode];
              
              // 数値の場合はスペーシング値として扱う
              if (typeof value === 'number') {
                spacingValues[variable.name] = `${value}px`;
              }
            }
          });
        }
      });
    } catch (variablesError) {
      console.log('Figma変数情報の取得に失敗しましたが、処理を続行します:', variablesError.message);
      // 変数APIがサポートされていない場合や、ファイルに変数が存在しない場合は無視して続行
    }
    
    return {
      colors: colorStyles,
      typography: textStyles,
      effects: effectStyles,
      spacing: spacingValues
    };
  } catch (error) {
    console.error('Figmaからのスタイル情報取得エラー:', error);
    // エラーメッセージの詳細を出力
    if (error.response) {
      console.error('Figma API応答:', error.response.data);
      console.error('ステータスコード:', error.response.status);
    }
    
    // エラーが発生した場合でも、最低限の空オブジェクトを返す
    return {
      colors: {},
      typography: {},
      effects: {},
      spacing: {}
    };
  }
}

/**
 * スタイルIDを持つノードを見つける関数
 * @param {Object} node 検索するノード
 * @param {string} styleId 検索するスタイルID
 * @param {Array} result 結果を格納する配列
 * @returns {Array} スタイルIDを持つノードの配列
 */
function findNodesWithStyleId(node, styleId, result = []) {
  // このノードが指定されたスタイルIDを持っているか確認
  if (node.styles) {
    const styleTypes = ['fill', 'stroke', 'text', 'effect', 'grid'];
    
    for (const type of styleTypes) {
      if (node.styles[type] === styleId) {
        result.push(node);
        return result;
      }
    }
  }
  
  // 子ノードがあれば再帰的に検索
  if (node.children) {
    for (const child of node.children) {
      findNodesWithStyleId(child, styleId, result);
    }
  }
  
  return result;
} 
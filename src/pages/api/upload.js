import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFigmaDesignSystem } from '../../utils/figmaAPI';

export async function POST({ request }) {
  try {
    console.log('APIリクエスト受信: /api/upload');
    
    // 環境変数をログに出力（セキュリティのため最初の数文字のみ）
    const openaiKey = import.meta.env.OPENAI_API_KEY;
    const anthropicKey = import.meta.env.ANTHROPIC_API_KEY;
    
    console.log('OpenAI API Key設定状況:', openaiKey ? `設定済み (${openaiKey.substring(0, 3)}...)` : '未設定');
    console.log('Anthropic API Key設定状況:', anthropicKey ? `設定済み (${anthropicKey.substring(0, 3)}...)` : '未設定');
    
    // リクエストヘッダーをログに出力
    console.log('Content-Type:', request.headers.get('Content-Type'));
    
    // フォームデータの取得を安全に行う
    let formData;
    try {
      formData = await request.formData();
      console.log('フォームデータ取得成功');
    } catch (formError) {
      console.error('フォームデータ取得エラー:', formError);
      return new Response(
        JSON.stringify({ 
          error: `フォームデータの解析に失敗しました: ${formError.message}`,
          contentType: request.headers.get('Content-Type')
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const imageFile = formData.get('image');
    const modelType = formData.get('model') || 'gpt'; // デフォルトはGPT
    // Figmaスタイル使用フラグを取得
    const useFigmaStyles = formData.get('useFigmaStyles') === 'true';
    
    console.log('モデルタイプ:', modelType);
    console.log('Figmaスタイル使用:', useFigmaStyles);
    console.log('画像ファイル受信:', imageFile ? `${imageFile.name} (${imageFile.type})` : '画像なし');
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: '画像ファイルが提供されていません' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 選択されたモデルに応じてAPIキーを取得
    let apiKey;
    if (modelType === 'gpt') {
      apiKey = import.meta.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'OpenAI APIキーが設定されていません' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      apiKey = import.meta.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Anthropic APIキーが設定されていません' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 画像データをバイナリ形式で取得
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Base64エンコード
    const base64Image = buffer.toString('base64');
    console.log('画像をBase64エンコード完了: 長さ', base64Image.length);

    // ダミー画像のURL
    const dummyImages = {
      people: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
      ],
      nature: [
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop"
      ],
      food: [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop"
      ],
      product: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop"
      ],
      logos: [
        "https://placehold.co/200x100/4f46e5/ffffff?text=Logo",
        "https://placehold.co/200x100/10b981/ffffff?text=Brand",
        "https://placehold.co/200x100/f59e0b/ffffff?text=Company"
      ],
      icons: [
        "https://placehold.co/50x50/4f46e5/ffffff?text=Icon",
        "https://placehold.co/50x50/10b981/ffffff?text=Icon",
        "https://placehold.co/50x50/f59e0b/ffffff?text=Icon"
      ]
    };
    
    // 基本プロンプトテキスト
    let promptText = `この手書きスケッチはUIデザインのものです。このスケッチを元に、実際のWebサイトやアプリのようなUIを生成してください。

まず、このスケッチがスマートフォン、タブレット、デスクトップのどのデバイス向けかを分析してください。重要なのは写真全体の比率ではなく、スケッチ内に描かれているデバイス（画面）の輪郭形状と比率です。例えば：
- 縦長の細い長方形はスマートフォン向け
- やや縦長の中間サイズの長方形はタブレット向け
- 横長の大きな長方形はデスクトップ向け

スケッチに描かれたコンテンツやレイアウトからも判断できます：
- モバイルアプリ風のナビゲーションバーやハンバーガーメニュー
- タブレット特有の分割表示やマルチカラム
- デスクトップ向けの広いレイアウトやメニューバー

必ずスケッチの内容とそこに描かれたデバイス形状から判断し、deviceTypeフィールドに "mobile", "tablet", "desktop" のいずれかを指定してください。

### 図形要素の処理
スケッチ内に描かれた図形要素（円、四角形、線など）は、テキストとして解釈せず、実際の図形要素として実装してください。特に以下の点に注意してください：
- 円形の要素 → divタグで円を作成（border-radius: 50%）
- 小さな円や点 → ボタン、アイコン、ドットナビゲーションなどとして実装
- 四角形 → カード、ボタン、コンテナなどとして実装
- 線 → 区切り線（hr）、ボーダー、枠線として実装

例えば、手書きの円はこのように実装します：
\`\`\`html
<div class="circle"></div>
\`\`\`

\`\`\`css
.circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #e0e0e0;
}
\`\`\`

### 画像の扱い方
スケッチ内に画像が描かれている場合は、実際の画像を挿入せず、以下のようなプレースホルダーとして表現してください：
- img要素を使用し、src属性は空または "#" を設定
- 背景色を薄いグレー (#f0f0f0 や #e5e5e5 など) に設定
- 必要に応じて枠線を追加（1px程度の薄いグレー）
- 画像のサイズはスケッチの相対的な大きさを考慮して設定

例：
\`\`\`html
<div class="image-placeholder">
  <div class="placeholder-content">画像プレースホルダー</div>
</div>
\`\`\`

\`\`\`css
.image-placeholder {
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%; /* スケッチの相対サイズに合わせて調整 */
  height: 200px; /* スケッチの相対サイズに合わせて調整 */
}
.placeholder-content {
  color: #888;
  font-size: 14px;
}
\`\`\`

### 要素サイズと位置
スケッチ内の要素の相対的な大きさと位置関係を注意深く分析し、実装してください：
- テキストのサイズ：スケッチ内でのテキストの大きさと重要度を考慮
- ボタンのサイズ：スケッチでの表現に応じた適切なサイズ設定
- レイアウトのバランス：要素間の余白や配置を忠実に再現
- コンポーネント間の階層関係：視覚的な優先順位を維持

コード生成に関して、以下の点に特に注意してください：
1. スケッチの基本的なレイアウトと要素の配置を維持してください
2. UIのスタイルはモダンで洗練されたものを意識してください
3. 以下の一般的なUIパターンを適用してください：
   - ヘッダー部分は固定（position: fixed/sticky）にする
   - ナビゲーションメニューはモバイルではハンバーガーメニューにする
   - ボタンやリンクには適切なホバーエフェクトを追加する
   - フォーム要素には適切なフォーカス状態を実装する
   - スクロール可能なコンテンツには適切なスクロールインジケーターを表示する
   - 画像ギャラリーやスライダーは実際に動作するよう実装する
4. モダンなレイアウト技術を使用してください：
   - Flexbox
   - CSS Grid
   - CSSカスタムプロパティ（変数）`;

    // Figmaスタイル情報を取得して拡張プロンプトを作成
    if (useFigmaStyles) {
      try {
        console.log('Figmaスタイル情報を取得中...');
        const designSystem = await getFigmaDesignSystem();
        console.log('Figmaスタイル情報の取得成功');
        
        // カラースタイルの情報をフォーマット
        const colorStyles = Object.entries(designSystem.colors || {})
          .map(([name, values]) => `${name}: ${values.rgba} (${values.hex})`)
          .join('\n');
        
        // タイポグラフィスタイルの情報をフォーマット
        const textStyles = Object.entries(designSystem.typography || {})
          .map(([name, props]) => {
            return `${name}:\n  font-family: ${props.fontFamily}\n  font-size: ${props.fontSize}\n  font-weight: ${props.fontWeight}\n  line-height: ${props.lineHeight}\n  letter-spacing: ${props.letterSpacing}`;
          })
          .join('\n\n');
        
        // スペーシングスタイルの情報をフォーマット
        const spacingStyles = Object.entries(designSystem.spacing || {})
          .map(([name, value]) => `${name}: ${value}`)
          .join('\n');
        
        // エフェクトスタイルの情報をフォーマット
        const effectStyles = Object.entries(designSystem.effects || {})
          .map(([name, effects]) => {
            const effectValues = effects.map(effect => `  ${effect.type}: ${effect.value}`).join('\n');
            return `${name}:\n${effectValues}`;
          })
          .join('\n\n');
        
        // プロンプトを拡張
        promptText += `

### デザインシステム情報
以下のFigmaから取得したデザインシステムの情報を使用して、HTMLとCSSを生成してください。
生成されたCSSコードは、可能な限りこれらの値を参照してください。

## カラースタイル
${colorStyles || '// カラースタイル情報がありません'}

## タイポグラフィスタイル
${textStyles || '// タイポグラフィスタイル情報がありません'}

## スペーシングスタイル
${spacingStyles || '// スペーシングスタイル情報がありません'}

## エフェクトスタイル
${effectStyles || '// エフェクトスタイル情報がありません'}

CSSを記述する際は、これらのFigmaスタイル名をCSS変数として宣言し、参照するようにしてください。例えば:

\`\`\`css
:root {
  /* カラー変数 */
  --color-primary: #3B82F6;
  --color-text-primary: #1F2937;
  
  /* タイポグラフィ変数 */
  --typography-heading-1-font-size: 24px;
  --typography-heading-1-font-weight: 700;
  
  /* スペーシング変数 */
  --spacing-s: 8px;
  --spacing-m: 16px;
}

.button {
  background-color: var(--color-primary);
  padding: var(--spacing-s) var(--spacing-m);
  font-size: var(--typography-body-regular-font-size);
}
\`\`\`

このようにして、スケッチを解析し、上記のデザインシステムに従ったUIコードを生成してください。`;

        console.log('Figmaスタイル情報をプロンプトに追加しました');
      } catch (error) {
        console.error('Figmaスタイル情報の取得に失敗:', error);
        // エラーがあっても処理を続行（基本プロンプトを使用）
      }
    }
    
    promptText += `

重要：レスポンスは必ず次のJSON形式のみで返してください。他の説明は一切不要です：
{"analysis": "スケッチの分析結果", "reasoning": "変換の説明", "deviceType": "mobile/tablet/desktop", "html": "HTMLコード", "css": "CSSコード", "js": "JavaScriptコード"}`;

    let content;

    // モデル別の処理
    if (modelType === 'gpt') {
      // OpenAI APIを使用
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // GPT-4 Visionに画像を送信して解析
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${imageFile.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" }
      });

      content = response.choices[0].message.content;
    } else {
      // Claude APIを使用
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-opus-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: promptText
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: imageFile.type,
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();

      // レスポンスの構造によって適切な内容を取得
      if (result.content && result.content.length > 0) {
        // Claude API v1 形式のレスポンス
        const textContent = result.content.find(item => item.type === 'text');
        if (textContent) {
          content = textContent.text;
        }
      } else if (result.error) {
        throw new Error(`Claude API エラー: ${result.error.message || JSON.stringify(result.error)}`);
      }
    }

    // JSONレスポンスから必要なコンテンツを抽出
    try {
      // テキスト応答からJSONパートを抽出するヘルパー関数
      const extractJsonFromText = (text) => {
        try {
          // JSONオブジェクトを含む部分を見つける
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            // 改行とコントロール文字を処理
            let jsonStr = jsonMatch[0];
            // コントロール文字をエスケープ
            jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            // 改行文字をスペースに置換
            jsonStr = jsonStr.replace(/\n/g, ' ');
            return jsonStr;
          }
          return text; // JSONが見つからない場合は元のテキストを返す
        } catch (e) {
          console.error('JSON抽出エラー:', e);
          return '{}'; // エラーの場合は空のJSONオブジェクトを返す
        }
      };
      
      // JSONの解析を試みる
      let jsonContent = modelType === 'gpt' ? content : extractJsonFromText(content);
      console.log('抽出されたJSON:', jsonContent.substring(0, 100) + '...');
      let parsedContent;
      
      try {
        parsedContent = JSON.parse(jsonContent);
      } catch (e) {
        console.error('JSON解析エラー:', e);
        // 解析に失敗した場合は最低限のオブジェクトを作成
        parsedContent = {
          analysis: "JSONの解析に失敗しました",
          reasoning: "レスポンスの解析に失敗しました: " + e.message,
          deviceType: "desktop",
          html: "<div>HTMLコードを生成できませんでした</div>",
          css: "/* スタイル情報の生成に失敗しました */",
          js: "// スクリプト情報の生成に失敗しました"
        };
      }
      
      // 必要なフィールドがない場合はデフォルト値を設定
      if (!parsedContent.analysis) parsedContent.analysis = "分析情報がありません";
      if (!parsedContent.reasoning) parsedContent.reasoning = "推論情報がありません";
      if (!parsedContent.deviceType) parsedContent.deviceType = "desktop"; // デフォルトはデスクトップ
      if (!parsedContent.html) parsedContent.html = "<div>HTMLコードを生成できませんでした</div>";
      if (!parsedContent.css) parsedContent.css = "/* スタイル情報がありません */";
      if (!parsedContent.js) parsedContent.js = "// スクリプト情報がありません";
      
      // 分析と推論をログに出力
      console.log("=== スケッチ分析結果 ===");
      console.log(parsedContent.analysis);
      console.log("=== 変換の思考過程 ===");
      console.log(parsedContent.reasoning);
      console.log("=== デバイスタイプ ===");
      console.log(parsedContent.deviceType);
      
      // 画像サイズによるデバイスタイプの自動判定は無効化
      /*
      // 画像の幅と高さから比率を取得する補助関数
      const getImageDimensions = async (buffer) => {
        try {
          const { fileTypeFromBuffer } = await import('file-type');
          const sizeOf = (await import('image-size')).default;
          const type = await fileTypeFromBuffer(buffer);
          const dimensions = sizeOf(buffer);
          return dimensions;
        } catch (e) {
          console.error('画像サイズの解析エラー:', e);
          return null;
        }
      };
      
      try {
        // 画像のバイナリデータから寸法を取得
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const dimensions = await getImageDimensions(buffer);
        
        if (dimensions && dimensions.width && dimensions.height) {
          const ratio = dimensions.width / dimensions.height;
          console.log(`画像の比率: ${ratio} (${dimensions.width}x${dimensions.height})`);
          
          // 比率に基づいてデバイスタイプをオーバーライド
          if (ratio >= 1.33) { // 4:3以上の横長比率
            console.log('比率に基づいてデスクトップとして判定');
            parsedContent.deviceType = 'desktop';
          } else if (ratio <= 0.67) { // 2:3以下の縦長比率
            console.log('比率に基づいてモバイルとして判定');
            parsedContent.deviceType = 'mobile';
          } else {
            console.log('比率に基づいてタブレットとして判定');
            parsedContent.deviceType = 'tablet';
          }
        }
      } catch (e) {
        console.log('画像サイズの取得に失敗しました:', e);
      }
      */
      
      return new Response(
        JSON.stringify(parsedContent),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      // JSONの解析に失敗した場合、エラーメッセージを返す
      console.error('JSONの解析に失敗しました:', e);
      console.log('受信した内容:', content);
      
      // JSON解析に失敗した場合、適切な形式に変換して返す
      const parsedContent = {
        analysis: "AIからの応答がJSON形式ではありませんでした。",
        reasoning: "レスポンスの解析に失敗しました。",
        deviceType: "desktop", // デフォルトはデスクトップ
        html: "<div>HTMLの生成に失敗しました</div>",
        css: "/* スタイル情報の生成に失敗しました */",
        js: "// スクリプト情報の生成に失敗しました"
      };
      
      return new Response(
        JSON.stringify(parsedContent),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        analysis: "エラーが発生しました",
        reasoning: "処理中にエラーが発生しました: " + error.message,
        deviceType: "desktop", // デフォルトはデスクトップ
        html: "<div>エラーが発生しました</div>",
        css: "/* エラーが発生しました */",
        js: "// エラーが発生しました"
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
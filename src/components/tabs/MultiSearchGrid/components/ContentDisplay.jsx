import React from 'react';

const ContentDisplay = ({ contentType = 'default', config = {} }) => {
  // Defensive defaults
  const safeContentType = contentType || 'default';
  const safeConfig = config || {};
  const renderPictureContent = () => (
    <div className="css-art-container w-full h-full bg-gradient-to-b from-sky-200 to-blue-50 relative overflow-hidden rounded-lg">
      {/* Sun */}
      <div className="css-art-sun absolute top-[15%] right-[15%] w-12 h-12 bg-gradient-radial from-yellow-100 via-yellow-400 to-transparent rounded-full" />
      
      {/* Mountains */}
      <div 
        className="css-art-mountain absolute bottom-0 left-0 w-full h-3/5 bg-blue-600"
        style={{
          clipPath: 'polygon(0% 100%, 100% 100%, 100% 40%, 75% 20%, 50% 50%, 25% 30%, 0 60%)'
        }}
      >
        <div 
          className="absolute bottom-0 left-0 w-full h-full bg-blue-500 -z-10 scale-110 translate-x-[-5%] translate-y-[10%]"
          style={{
            clipPath: 'polygon(0% 100%, 100% 100%, 100% 50%, 80% 30%, 60% 60%, 40% 40%, 20% 55%, 0 70%)'
          }}
        />
      </div>
    </div>
  );

  const renderChatContent = () => (
    <div className="flex flex-col space-y-2 text-sm p-2 w-full">
      <div className="bg-gray-200 p-2 rounded-lg self-end max-w-xs">
        {safeConfig.prompt || 'Sample query...'}
      </div>
      <div className="bg-indigo-100 text-indigo-800 p-2 rounded-lg self-start max-w-xs">
        Naravno, evo osnove Python skripte...
      </div>
      <div className="bg-indigo-100 text-indigo-800 p-2 rounded-lg self-start max-w-xs animate-pulse">
        ...generiram kod...
      </div>
    </div>
  );

  const renderTableContent = () => (
    <div className="w-full text-sm overflow-auto">
      <table className="w-full text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-2 py-1">Artikl</th>
            <th className="px-2 py-1">Opis</th>
            <th className="px-2 py-1">Regija</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white border-b">
            <td className="px-2 py-1">A01</td>
            <td className="px-2 py-1">Čelični zupčanik</td>
            <td className="px-2 py-1">Sjever</td>
          </tr>
          <tr className="bg-gray-50 border-b">
            <td className="px-2 py-1">B02</td>
            <td className="px-2 py-1">Keramički ležajevi</td>
            <td className="px-2 py-1">Istok</td>
          </tr>
          <tr className="bg-white">
            <td className="px-2 py-1">C03</td>
            <td className="px-2 py-1">Aluminijsko kućište</td>
            <td className="px-2 py-1">Zapad</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderDrawingContent = () => (
    <div className="ascii-art font-mono text-xs text-gray-600 text-center whitespace-pre-line leading-none">
      {`  /\\ 
 /  \\ gear 1
/____\\-------+
| [] |       |
+----+ [] [] |
|    |-------+
|    | gear 2
+----+-------+
| [] |       |
+----+-------+`}
    </div>
  );

  switch (safeContentType) {
    case 'picture':
      return renderPictureContent();
    case 'chat':
      return renderChatContent();
    case 'table':
      return renderTableContent();
    case 'drawing':
      return renderDrawingContent();
    default:
      return (
        <div className="text-gray-500 text-center p-4">
          <div className="text-lg mb-2">Content Ready</div>
          <div className="text-sm">Type: {safeContentType}</div>
        </div>
      );
  }
};

export default ContentDisplay;
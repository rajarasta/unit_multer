import React from 'react';

const UnitizerComponent = ({ fusedUnits, onUnitize }) => {
  const fusedNames = fusedUnits.map(u => u.unitName).join(' + ');
  const contentTypes = new Set(fusedUnits.map(u => u.contentType));

  const handleDragOver = (e) => {
    e.preventDefault();
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector) {
      connector.classList.add('dragging-over');
    }
  };

  const handleDragLeave = (e) => {
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector) {
      connector.classList.remove('dragging-over');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector) {
      connector.classList.remove('dragging-over');
    }
    
    const sourceUnitId = e.dataTransfer.getData('text/plain');
    if (sourceUnitId) {
      onUnitize?.(sourceUnitId, 'unitizer-component');
    }
  };

  const renderFusedContent = () => {
    // Complex fusion logic based on content types
    if (contentTypes.has('picture') && contentTypes.has('chat') && contentTypes.has('table')) {
      return (
        <div className="p-2 w-full">
          <h4 className="font-bold mb-2">Sveobuhvatni izvještaj o proizvodu</h4>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-2 py-1">Slika</th>
                  <th className="px-2 py-1">Artikl</th>
                  <th className="px-2 py-1">Opis</th>
                  <th className="px-2 py-1">Regija</th>
                  <th className="px-2 py-1">AI Komentar</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b">
                  <td className="px-2 py-1">🖼️</td>
                  <td className="px-2 py-1">A01</td>
                  <td className="px-2 py-1">Čelični zupčanik</td>
                  <td className="px-2 py-1">Sjever</td>
                  <td className="px-2 py-1">Optimalan za visoke performanse.</td>
                </tr>
                <tr className="bg-gray-50 border-b">
                  <td className="px-2 py-1">🖼️</td>
                  <td className="px-2 py-1">B02</td>
                  <td className="px-2 py-1">Keramički ležajevi</td>
                  <td className="px-2 py-1">Istok</td>
                  <td className="px-2 py-1">Preporučuje se inspekcija.</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-2 py-1">🖼️</td>
                  <td className="px-2 py-1">C03</td>
                  <td className="px-2 py-1">Aluminijsko kućište</td>
                  <td className="px-2 py-1">Zapad</td>
                  <td className="px-2 py-1">Visoka potražnja u ovoj regiji.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (contentTypes.has('picture') && contentTypes.has('drawing')) {
      return (
        <div className="relative w-full h-full">
          {/* Picture background */}
          <div className="css-art-container w-full h-full bg-gradient-to-b from-sky-200 to-blue-50 relative overflow-hidden rounded-lg">
            <div className="css-art-sun absolute top-[15%] right-[15%] w-12 h-12 bg-gradient-radial from-yellow-100 via-yellow-400 to-transparent rounded-full" />
            <div 
              className="css-art-mountain absolute bottom-0 left-0 w-full h-3/5 bg-blue-600"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 40%, 75% 20%, 50% 50%, 25% 30%, 0 60%)'
              }}
            />
          </div>
          {/* ASCII overlay */}
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="font-mono text-xs text-gray-800 whitespace-pre-line text-center leading-none">
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
          </div>
        </div>
      );
    }

    if (contentTypes.has('chat') && contentTypes.has('table')) {
      return (
        <div className="text-sm p-2 w-full">
          <div className="overflow-auto">
            <table className="w-full text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-2 py-1">Artikl</th>
                  <th className="px-2 py-1">Opis</th>
                  <th className="px-2 py-1">Regija</th>
                  <th className="px-2 py-1">AI Opis</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b">
                  <td className="px-2 py-1">A01</td>
                  <td className="px-2 py-1">Čelični zupčanik</td>
                  <td className="px-2 py-1">Sjever</td>
                  <td className="px-2 py-1">Izdržljiv materijal, pogodan za teške uvjete.</td>
                </tr>
                <tr className="bg-gray-50 border-b">
                  <td className="px-2 py-1">B02</td>
                  <td className="px-2 py-1">Keramički ležajevi</td>
                  <td className="px-2 py-1">Istok</td>
                  <td className="px-2 py-1">Nisko trenje, idealno za veliku brzinu.</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-2 py-1">C03</td>
                  <td className="px-2 py-1">Aluminijsko kućište</td>
                  <td className="px-2 py-1">Zapad</td>
                  <td className="px-2 py-1">Lagan i otporan na koroziju.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (contentTypes.has('picture') && contentTypes.has('chat')) {
      return (
        <div className="grid grid-cols-2 gap-4 h-full p-2">
          <div className="css-art-container bg-gradient-to-b from-sky-200 to-blue-50 relative overflow-hidden rounded-lg">
            <div className="css-art-sun absolute top-[15%] right-[15%] w-8 h-8 bg-gradient-radial from-yellow-100 via-yellow-400 to-transparent rounded-full" />
            <div 
              className="css-art-mountain absolute bottom-0 left-0 w-full h-3/5 bg-blue-600"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 40%, 75% 20%, 50% 50%, 25% 30%, 0 60%)'
              }}
            />
          </div>
          <div className="text-sm space-y-2">
            <p className="font-bold">Analiza slike:</p>
            <p className="text-xs">Slika prikazuje stilizirani planinski pejzaž...</p>
            <p className="font-bold text-xs mt-4">Prijedlog skripte:</p>
            <code className="text-xs bg-gray-100 p-2 block rounded mt-1">
              # Python za analizu slike...
            </code>
          </div>
        </div>
      );
    }

    if (contentTypes.has('chat') && contentTypes.has('drawing')) {
      return (
        <div className="text-sm p-2 space-y-2">
          <div className="bg-gray-200 p-2 rounded-lg max-w-xs">
            Nacrtaj shemu...
          </div>
          <div className="bg-indigo-100 text-indigo-800 p-2 rounded-lg max-w-xs">
            Evo sheme s komentarima:
          </div>
          <div className="font-mono text-xs text-center whitespace-pre-line leading-none">
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
        </div>
      );
    }

    if (contentTypes.has('table') && contentTypes.has('drawing')) {
      return (
        <div className="grid grid-cols-2 gap-4 h-full p-2">
          <div className="text-xs overflow-auto">
            <table className="w-full text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-1 py-1">Artikl</th>
                  <th className="px-1 py-1">Opis</th>
                  <th className="px-1 py-1">Regija</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b">
                  <td className="px-1 py-1">A01</td>
                  <td className="px-1 py-1">Čelični zupčanik</td>
                  <td className="px-1 py-1">Sjever</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-1 py-1">B02</td>
                  <td className="px-1 py-1">Keramički ležajevi</td>
                  <td className="px-1 py-1">Istok</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center">
            <div className="font-mono text-xs text-center whitespace-pre-line leading-none">
              {`  /\\ 
 /  \\ gear 1
/____\\-------+
| [] |       |
+----+ [] [] |`}
            </div>
          </div>
        </div>
      );
    }

    // Default fusion content
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-indigo-800 font-semibold">
          Nova fuzija je stvorena
        </p>
      </div>
    );
  };

  return (
    <div 
      className="relative w-full h-full bg-white border-2 border-indigo-500 rounded-xl flex flex-col p-4 shadow-lg"
      id="unitizer-component"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-2">
        {fusedUnits.length < 3 && (
          <div className="connector-btn w-4 h-4 rounded-full bg-indigo-600 cursor-pointer transition-all duration-200 hover:scale-110 shadow-md hover:shadow-lg hover:bg-green-500" />
        )}
        <div className="text-xs text-gray-400 font-mono">
          {fusedNames}
        </div>
      </div>

      {/* Fused Content Area */}
      <div className="flex-grow w-full h-full flex items-center justify-center pt-8">
        {renderFusedContent()}
      </div>

      {/* Small notification */}
      <div className="absolute bottom-1 right-2 text-[10px] text-gray-500">
        Pictures and design from internet
      </div>
    </div>
  );
};

export default UnitizerComponent;
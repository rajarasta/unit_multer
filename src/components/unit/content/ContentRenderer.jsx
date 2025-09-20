import React from 'react';
import EmptyView from './EmptyView';
import TextView from './TextView';
import PdfView from './PdfView';
import ImageView from './ImageView';
import TableView from './TableView';
import ExcelUnitView from './ExcelUnitView';

const ContentRenderer = ({ unitType, views }) => {
  switch (unitType) {
    case 'empty':
      return <EmptyView {...views.empty} />;
    case 'text':
    case 'textfile':
      return <TextView {...views.text} />;
    case 'pdf':
    case 'document':
      return <PdfView {...views.pdf} />;
    case 'image':
    case 'svg':
      return <ImageView {...views.image} />;
    case 'table':
      // Check if we're in Excel mode or regular table mode
      if (views.excel) {
        return <ExcelUnitView {...views.excel} />;
      }
      return <TableView {...views.table} />;
    case 'file':
    case 'dwg':
    case 'xml':
      // Use TableView as a generic file viewer
      return <TableView {...views.table} />;
    default:
      console.warn(`⚠️ Unknown unitType "${unitType}" in ContentRenderer`);
      return <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-lg font-medium">Unsupported type</div>
          <div className="text-sm">"{unitType}"</div>
        </div>
      </div>;
  }
};

export default ContentRenderer;

import React from 'react';
import EmptyView from './EmptyView';
import TextView from './TextView';
import PdfView from './PdfView';
import ImageView from './ImageView';
import TableView from './TableView';

const ContentRenderer = ({ unitType, views }) => {
  switch (unitType) {
    case 'empty':
      return <EmptyView {...views.empty} />;
    case 'text':
      return <TextView {...views.text} />;
    case 'pdf':
      return <PdfView {...views.pdf} />;
    case 'image':
      return <ImageView {...views.image} />;
    case 'table':
      return <TableView {...views.table} />;
    default:
      return null;
  }
};

export default ContentRenderer;

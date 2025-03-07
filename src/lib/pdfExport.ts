
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QuranNote } from "./types";

/**
 * Exports notes as a PDF file
 * @param notes Array of notes to export
 * @param projectName Name of the project for the PDF title
 */
export const exportNotesToPDF = (notes: QuranNote[], projectName: string) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(`${projectName} - Quran Notes`, 14, 22);
  
  // Add timestamp
  doc.setFontSize(10);
  const date = new Date().toLocaleString();
  doc.text(`Generated on: ${date}`, 14, 30);
  
  // Sort notes by surah and verse for the export
  const sortedNotes = [...notes].sort((a, b) => 
    a.surah === b.surah ? a.verse - b.verse : a.surah - b.surah
  );

  // Prepare table data
  const tableData = sortedNotes.map(note => [
    `${note.surah}:${note.verse}`, 
    note.text,
    note.createdAt ? new Date(note.createdAt.toDate()).toLocaleDateString() : ''
  ]);
  
  // Create table
  autoTable(doc, {
    startY: 35,
    head: [['Reference', 'Note', 'Date Added']],
    body: tableData,
    headStyles: {
      fillColor: [66, 133, 244],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'auto',
    },
    columnStyles: {
      0: { cellWidth: 30 }, // Reference column
      1: { cellWidth: 'auto' }, // Note column
      2: { cellWidth: 40 }, // Date column
    },
  });
  
  // Save the PDF
  doc.save(`${projectName.replace(/\s+/g, '_')}_notes.pdf`);
};

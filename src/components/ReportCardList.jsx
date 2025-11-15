import React from 'react';

const mockData = [
  { id: 1, student: 'Bayo Balogun', term: 'T1', average: 12.5 },
  { id: 2, student: 'Bayo Balogun', term: 'T2', average: 13.0 },
];

const ReportCardList = () => {
  return (
    <table className="w-full table-auto bg-white rounded shadow">
      <thead>
        <tr className="bg-gray-200">
          <th className="px-4 py-2">Student</th>
          <th className="px-4 py-2">Term</th>
          <th className="px-4 py-2">Average</th>
        </tr>
      </thead>
      <tbody>
        {mockData.map((rc) => (
          <tr key={rc.id} className="border-t">
            <td className="px-4 py-2">{rc.student}</td>
            <td className="px-4 py-2">{rc.term}</td>
            <td className="px-4 py-2">{rc.average}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ReportCardList;

import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getFileBoxList, downloadFile, deleteFile } from '../../api/fileApi';
import PageComponent from '../common/PageComponent';
import FilePreview from '../common/FilePreview';
import { formatDate } from '../../util/ticketUtils';

const FileBoxComponent = () => {
    const loginState = useSelector((state) => state.loginSlice);

    // 상태 관리
    const [tab, setTab] = useState('ALL');
    const [serverData, setServerData] = useState({ dtoList: [], totalCount: 0, pageNumList: [] });
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState('createdAt,desc');
    const [keyword, setKeyword] = useState('');
    const [searchTemp, setSearchTemp] = useState('');
    const [loading, setLoading] = useState(false);

    // 중복 파일명 처리 로직
    const processDuplicateNames = (files) => {
        const nameCountMap = {};
        return files.map(file => {
            const originalName = file.fileName;
            const lastDot = originalName.lastIndexOf('.');
            const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
            const ext = lastDot !== -1 ? originalName.substring(lastDot) : "";

            if (!nameCountMap[originalName]) {
                nameCountMap[originalName] = 1;
                return { ...file, displayName: originalName };
            } else {
                const count = nameCountMap[originalName]++;
                return { ...file, displayName: `${base} (${count})${ext}` };
            }
        });
    };

    const fetchData = useCallback(async () => {
        if (!loginState.email) return;
        setLoading(true);
        try {
            const data = await getFileBoxList(loginState.email, tab, { page, size: 10 }, { keyword, sort });
            if (data && data.dtoList) {
                data.dtoList = processDuplicateNames(data.dtoList);
            }
            setServerData(data || { dtoList: [], totalCount: 0, pageNumList: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [loginState.email, page, sort, tab, keyword]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setKeyword(searchTemp);
        setPage(1);
    };

    const handleDeleteFile = async (e, uuid, fileName) => {
        e.stopPropagation();
        if (window.confirm(`'${fileName}' 파일을 영구적으로 삭제하시겠습니까?`)) {
            try {
                await deleteFile(uuid);
                fetchData();
            } catch (error) {
                alert("파일 삭제 실패");
            }
        }
    };

    return (
        <div className="w-full">
            {/* 제목: 파일 함 */}
            <h1 className="text-4xl font-extrabold mb-10 text-gray-900 border-b-8 border-blue-500 pb-4 inline-block tracking-normal">
                파일 함
            </h1>

            {/* 필터 및 검색 바  */}
            <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center mb-8 gap-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">

                {/* 탭 버튼 */}
                <div className="flex bg-gray-100 p-2 rounded-2xl shadow-inner">
                    {['ALL', 'SENT', 'RECEIVED'].map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setPage(1); }}
                            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                                tab === t ? "bg-white text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            {t === 'ALL' ? '전체' : t === 'SENT' ? '발신' : '수신'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-grow">
                    {/* 정렬 선택 */}
                    <select
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        className="border-2 border-gray-200 p-3 rounded-2xl bg-white font-bold focus:border-blue-500 outline-none w-36 shadow-sm"
                    >
                        <option value="createdAt,desc">최신순</option>
                        <option value="createdAt,asc">오래된순</option>
                    </select>

                    {/* 검색창 */}
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="파일명 검색..."
                            value={searchTemp}
                            onChange={(e) => setSearchTemp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full border-2 border-gray-200 p-3 pl-6 rounded-2xl font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner"
                        />
                    </div>

                    {/* 검색 버튼 */}
                    <button
                        onClick={handleSearch}
                        className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg"
                    >
                        검색
                    </button>
                </div>
            </div>

            {/* 파일 리스트 박스 */}
            <div className="bg-white p-10 rounded-[45px] shadow-2xl border border-gray-100 min-h-[600px] flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-xl font-black italic uppercase tracking-wider text-gray-800">
                        {tab === 'SENT' ? 'SENT FILES' : tab === 'RECEIVED' ? 'RECEIVED FILES' : 'ALL FILES'}
                    </h2>
                    <span className="bg-blue-500 px-6 py-1 rounded-full text-sm font-black italic text-white">
                        TOTAL: {serverData?.totalCount || 0}
                    </span>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center font-black text-gray-200 text-3xl animate-pulse uppercase italic">Loading...</div>
                ) : serverData?.dtoList?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
                        {serverData.dtoList.map((file) => (
                            <div key={file.uuid} onClick={() => downloadFile(file.uuid, file.fileName)} className="group cursor-pointer relative">
                                {/* 삭제 버튼 */}
                                <button
                                    onClick={(e) => handleDeleteFile(e, file.uuid, file.displayName)}
                                    className="absolute -top-2 -right-2 z-10 bg-red-500 text-white w-7 h-7 rounded-full font-black text-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                >
                                    &times;
                                </button>

                                <div className="aspect-square bg-gray-50 rounded-[35px] border-2 border-gray-100 overflow-hidden mb-3 shadow-sm relative group-hover:border-blue-500 transition-all">
                                    <FilePreview file={file} />
                                </div>
                                <div className="px-2">
                                    <div className="text-xs font-black truncate text-gray-800" title={file.displayName}>
                                        {file.displayName}
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-bold">
                                        <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                                        <span>{formatDate(file.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-200 italic font-black text-4xl">NO FILES</div>
                )}

                <div className="mt-12 flex justify-center border-t border-gray-50 pt-10">
                    {serverData?.pageNumList?.length > 0 && (
                        <PageComponent serverData={serverData} movePage={(p) => setPage(p.page)} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileBoxComponent;
import React, { useContext, useEffect } from 'react'
import { userContext } from '../Context/userContext'
import connect from '../axios/connect';
import { useNavigate } from 'react-router-dom';

interface VisibilityOption {
  value: string;
  label: string;
}

const Repo = () => {
  const { login } = useContext(userContext);
  const [visibilityOptions, setVisibilityOptions] = React.useState<VisibilityOption[]>([]);
  const [visibility, setVisibility] = React.useState<string>('public');
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await connect.get('/repositories/options/');
        setVisibilityOptions(res.data.visibility);
      } catch (error) {
        console.error('Error fetching visibility options:', error);
      }
    })();
  }, []);

  const handleSubmit = async (data: FormData) => {

    const name = data.get('repoName') as string;
    const description = data.get('description') as string;
    const visibility = data.get('visibility') as string;
    try {
      await connect.post('/repositories/', {
        name,
        description,
        visibility
      });
      nav("profile?tab=repositories");
    } catch (error) {
      console.error('Error creating repository:', error);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] pt-8 pb-12 px-4 md:px-0 font-sans text-[#1f2328]">
      <div className="max-w-[760px] mx-auto">

        {/* Header */}
        <div className="border-b border-[#d0d7de] pb-4 mb-8">
          <h1 className="text-2xl font-normal leading-tight">Create a new repository</h1>
          <p className="text-sm text-[#636c76] mt-1">
            A repository contains all project files, including the revision history.
          </p>
        </div>

        <form action={handleSubmit}>
          {/* Owner / Repo Name Group */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-2 mb-4">
            {/* Owner */}
            <div className='flex flex-col gap-2'>
              <label className="text-sm font-semibold block">Owner</label>
              <div className="relative">
                <button type="button" className="w-full md:w-auto text-left px-3 py-[5px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md shadow-sm text-sm font-medium flex items-center gap-2 hover:bg-[#ebf0f4] transition-colors">
                  <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-600 font-bold overflow-hidden">
                    {login?.first_name?.[0]}
                  </span>
                  <span>{login?.first_name || 'Owner'}</span>
                  <svg className="w-2.5 h-2.5 ml-1 text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-xl text-[#636c76] pb-1 px-1 shrink-0">/</div>

            {/* Repository Name */}
            <div className="grow w-full md:w-auto flex flex-col gap-2">
              <label htmlFor="repoName" className="text-sm font-semibold block">
                Repository name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="repoName"
                name="repoName"
                required
                className="w-full px-3 py-[5px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md shadow-sm text-sm focus:outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              />
            </div>
          </div>

          

          {/* Description */}
          <div className="mb-8">
            <label htmlFor="description" className="text-sm font-semibold block mb-2">
              Description <span className="text-[#636c76] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              className="w-full px-3 py-[5px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md shadow-sm text-sm focus:outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
            />
          </div>

          <hr className="border-[#d0d7de] my-4" />

          {/* Visibility */}
          <div className="mb-8">
            {visibilityOptions.map((option) => (
              <div key={option.value} className="relative mb-4">
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id={`visibility-${option.value}`}
                      name="visibility"
                      type="radio"
                      value={option.value}
                      checked={visibility === option.value}
                      onChange={() => setVisibility(option.value)}
                      className="h-4 w-4 border-gray-300 text-[#0969da] focus:ring-[#0969da]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`visibility-${option.value}`} className="font-medium text-[#1f2328] flex items-center gap-2 cursor-pointer">
                      {option.value === 'public' ? (
                        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="octicon octicon-book fill-[#636c76]">
                          <path d="M0 5.75C0 4.784.784 4 1.75 4h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25Z"></path>
                          <path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v2.086A1.75 1.75 0 0 1 13.25 8.5V7H2.75a.25.25 0 0 0-.25.25v6C1.116 13.25 0 12.134 0 10.75v-9Z"></path>
                        </svg>
                      ) : (
                        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="octicon octicon-lock fill-[#9a6700]">
                          <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm4-2.5a2.5 2.5 0 0 0-2.5 2.5v2h5v-2a2.5 2.5 0 0 0-2.5-2.5ZM3.75 7.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                      )}
                      {option.label}
                    </label>
                    <p className="text-[#636c76] mt-1">
                      {option.value === 'public'
                        ? "Anyone on the internet can see this repository. You choose who can commit."
                        : "You choose who can see and commit to this repository."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-[#d0d7de] my-4" />

          <button type="submit" className="bg-[#1f883d] text-white px-4 py-1.5 rounded-md font-medium text-sm hover:bg-[#1a7f37] transition-colors shadow-sm mb-20 disabled:opacity-50 disabled:cursor-not-allowed">
            Create repository
          </button>
        </form>
      </div>
    </div>
  )
}

export default Repo;
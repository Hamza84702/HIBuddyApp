import {UsersIcon} from "@heroicons/react/24/solid";

import React from 'react'

const GroupAvatar = ({}) => {
  return (
    <>
        <div className={`avatar placeholder`}>
            <div className={`bg-gray-400 text-gray-800 rounded-full w-8`}>
                <span className="text-x1">
                    <UsersIcon className="w-4"/>
                </span>
            </div>
        </div>
    </>
  )
}

export default GroupAvatar
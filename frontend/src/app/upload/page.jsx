"use client"

import { Button } from "@/components/ui/button"
import { JSX, SVGProps, useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import axios from "axios"
import Loading from "./loading"
import { encryptRunServerMode } from "@/lib/litHelper"

export default function Dashboard() {

  const [uploading, setUploading] = useState(false)
  const [encrypting, setEncrypting] = useState(false)

  const onDrop = useCallback(async (acceptedFiles) => {

    if (acceptedFiles[0]) {

      const formData = new FormData();

      const pinataOptions = JSON.stringify({
        cidVersion: 0,
      })

      formData.append('pinataOptions', pinataOptions);
      formData.append('file', acceptedFiles[0]);

      const pinataMetadata = JSON.stringify({
        name: acceptedFiles[0].name,
      });
      formData.append('pinataMetadata', pinataMetadata);

      try {
        setUploading(true);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
          headers: {
            'Content-Type': `multipart/form-data`,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_API_KEY}`
          }
        });

        const message = res.data.IpfsHash;
        console.log(message);

        const uploadformData = new FormData();

        uploadformData.append('file', acceptedFiles[0]);

        const uploadRes = await axios.post("/api/upload", formData, {
          headers: {
            'Content-Type': `multipart/form-data`,
          }
        });

        if (uploadRes.status === 200) {
          console.log(uploadRes.data)

          // const encryptRes = await axios.post("/api/encrypt", {
          //   dataCid: res.data.IpfsHash
          // });

          const data = {
            name: acceptedFiles[0].name,
            hash: res.data.IpfsHash,
            size: res.data.PinSize,
            columns: uploadRes.data.columnNames,
            firstFiveRows: uploadRes.data.firstFiveRows
          }

          const jsonData = JSON.stringify(data);

          const blob = new Blob([jsonData], { type: 'application/json' });

          const metadataformData = new FormData();

          const pinataOptions = JSON.stringify({
            cidVersion: 0,
          })

          metadataformData.append('pinataOptions', pinataOptions);
          metadataformData.append('file', blob);

          const pinataMetadata = JSON.stringify({
            name: acceptedFiles[0].name + ` metadata`,
          });
          metadataformData.append('pinataMetadata', pinataMetadata);

          const metadataRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", metadataformData, {
            headers: {
              'Content-Type': `multipart/form-data`,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_API_KEY}`
            }
          });

          console.log(metadataRes);

          setUploading(false);
          setEncrypting(true);

          const { ciphertext, dataToEncryptHash } = await encryptRunServerMode(metadataRes.data.IpfsHash);
          console.log(ciphertext, dataToEncryptHash)

          setEncrypting(false);
        }
      } catch (error) {
        console.log(error);
        setEncrypting(false);
      }
    }

  }, [])

  console.log(encrypting, uploading)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className=" max-w-xl mx-auto p-6 md:p-8 lg:p-10">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dataset</h1>
          <p className="text-gray-500 dark:text-gray-400">Upload your dataset here</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center ${isDragActive ? "bg-gray-100" : ""
                }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div>
                  <p>Drag and drop files here, or click to select files</p>
                  <Button className="mt-4">Select Files</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {(uploading || encrypting) && <Loading uploading={uploading} encrypting={encrypting} />}
    </div>
  )
}

function PlusIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
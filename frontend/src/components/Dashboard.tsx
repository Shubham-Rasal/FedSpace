"use client";

import Link from "next/link";
import { set, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatabaseIcon } from "lucide-react";

import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  FormField,
} from "@/components/ui/form";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Repo name is required"),
  requirements: z.instanceof(FileList),
  model: z.instanceof(FileList),
  dataset: z.string().min(1, "Dataset selection is required"),
});

const template = {
  machine: {
    gpu: 0,

    cpu: 1000,

    ram: 100,
  },

  job: {
    APIVersion: "V1beta1",

    Spec: {
      Deal: {
        Concurrency: 1,
      },

      Docker: {
        Image:
          "shubhamrasal007/fedspace:mushroom_model:0.0.1@sha256:a189071e06161de75a4532cbc7f76440879efb65e7aae7300377674ee9e4eaba",
      },

      Engine: "Docker",

      Network: {
        Type: "None",
      },

      PublisherSpec: {
        Type: "IPFS",
      },

      Resources: {
        GPU: "",
      },

      Timeout: 1800,

      Verifier: "Noop",
    },
  },
};

export default function Dashboard() {
  const [deploying, setDeploying] = useState(false);
  const [imageName, setImageName] = useState("");
  const [deployed, setDeployed] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      name: "shubhamrasal007/fedspace",
      dataset:
        "https://gateway.lighthouse.storage/ipfs/QmSiVp36NpUQaJwSWv2wHDB1FofF8nxAkeyhQXom3LikVf",
    },
  });

  const requirementsRef = form.register("requirements");
  const modelRef = form.register("model");

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
    setDeploying(true);
    const formData = new FormData();
    formData.append("dockerhub-repo", values.name);
    formData.append("requirements-file", values.requirements[0]);
    formData.append("python-file", values.model[0]);
    formData.append("dataset-url", values.dataset);

    fetch("http://localhost:5000/build", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setImageName(data.imageName);
        template.job.Spec.Docker.Image = data.imageName;
        setDeploying(false);
        setDeployed(true);
      });
  }

  return (
    <div className="flex min-h-screen">
      <div className="bg-gray-900 text-white p-6 hidden md:block w-64 shrink-0">
        <div className="space-y-4">
          <Link
            href="#"
            className="flex items-center gap-2 font-bold text-lg"
            prefetch={false}
          >
            <Grid3x3Icon className="w-6 h-6" />
            <span>ML Deployment</span>
          </Link>
          <nav className="space-y-2">
            <Link
              href="#"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              prefetch={false}
            >
              <Grid3x3Icon className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              prefetch={false}
            >
              <LayersIcon className="w-5 h-5" />
              <span>Deploy Models</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              prefetch={false}
            >
              <DatabaseIcon className="w-5 h-5" />
              <span>Upload Datasets</span>
            </Link>
          </nav>
        </div>
      </div>
      <div className="flex-1 bg-gray-100 dark:bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Deploy Model</h1>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Docker Hub Repo</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        placeholder="Enter your repo name"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".txt"
                          placeholder="requirements.txt"
                          {...requirementsRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Python Model File</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".py"
                          placeholder="model.py"
                          {...modelRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="dataset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="dataset">Dataset URL</FormLabel>
                    <FormControl>
                      <Input
                        id="dataset"
                        placeholder="Enter your dataset name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors && (
                <div className="text-destructive text-sm">
                  {Object.values(form.formState.errors).map((error) => (
                    <p key={error.message}>{error.message}</p>
                  ))}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={deploying}>
                {deploying ? "Deploying..." : "Deploy"}
              </Button>
            </form>
          </Form>
        </div>
        <div className="">
          {deploying && (
            <div className="bg-gray-200 p-4 rounded mt-4">
              <p>Deploying your model...</p>
              <p>Image Name: {imageName}</p>
            </div>
          )}
          {deployed && (
            <div className="">
              <h1>
                This is the custom lily job template that you can use to deploy.
              </h1>
              <pre>
                <code>{JSON.stringify(template, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Grid3x3Icon(props: any) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

function LayersIcon(props: any) {
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
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

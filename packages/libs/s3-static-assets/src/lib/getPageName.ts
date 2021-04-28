const getPageName = (file: string, base: string): string => {
  const relative = file.slice(base.length + 1);
  const withoutBuildId = relative.split("/", 2)[1];
  const withoutExtension = withoutBuildId.replace(/\.(html|json)$/, "");
  return `/${withoutExtension}`;
};

export default getPageName;

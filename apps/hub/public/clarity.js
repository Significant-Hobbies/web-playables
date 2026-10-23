window.clarity ||= (...args) => {
  window.clarity.q ||= [];
  window.clarity.q.push(args);
};

const script = document.createElement("script");
script.async = true;
script.src = "https://www.clarity.ms/tag/y6bw57fiim";
document.head.append(script);
window.clarity("set", "project_id", "web-playables");

// JavaScript do Dashboard Trend Hunter

// Configuração API Backend
const API_BASE_URL = window.location.origin;

// Variáveis globais
let currentData = [];
let platformChart, categoryChart, rankingChart;
let currentChartFilters = {
  platform: "all",
  category: "top10",
  ranking: "top5",
};
let opportunitiesData = [];

// Inicialização
document.addEventListener("DOMContentLoaded", async function () {
  // Definir datas padrão (últimos 7 dias) - formato dd/MM/yyyy
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  document.getElementById("dateTo").value = formatDate(today);
  document.getElementById("dateFrom").value = formatDate(sevenDaysAgo);

  await loadData();
  await populateFilters();
  await loadOpportunities();
  await loadPodium();
  setupEventListeners();
});

// Carregar dados via API Backend (completo para gráficos)
async function loadData() {
  try {
    console.log(" Conectando à API para dados completos:", API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}/api/analytics-full`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // NOVO: Proteção contra erro de servidor ou resposta vazia
    if (!result || result.error) {
      console.error(
        "Erro reportado pela API:",
        result?.error || "Resposta vazia",
      );
      showError(
        `Erro ao carregar dados: ${result?.error || "Erro desconhecido"}`,
      );
      return;
    }

    const data = result.data || [];
    console.log(
      " Dados completos carregados via API:",
      data.length,
      "produtos",
    );
    console.log(" Total real na tabela:", result.total || "desconhecido");

    if (Array.isArray(data)) {
      // Verificar se os dados têm a estrutura esperada
      if (data.length === 0) {
        console.log(" Nenhum produto encontrado com os filtros atuais");
        // Não mostrar erro, apenas continuar com array vazio
        currentData = data;
        updateDashboard(currentData);
        updateTable(currentData);
        return;
      }

      // Verificar estrutura dos dados (adaptar para dados reais)
      const hasValidStructure = data.every(
        (item) =>
          item &&
          typeof item === "object" &&
          (item.data || item.name || item.title), // Flexível para diferentes estruturas
      );

      if (hasValidStructure) {
        currentData = data;
        updateDashboard(currentData);
        updateTable(currentData);

        // Mostrar estatísticas reais
        if (result.total && result.total > 100) {
          console.log(
            ` Análise completa: ${data.length} produtos carregados de ${result.total} totais`,
          );
        }
      } else {
        console.error(" Estrutura de dados inválida:", data[0]);
        console.log(
          " Estrutura esperada: objeto com propriedade 'data', 'name' ou 'title'",
        );
        showError("Estrutura de dados inesperada");
      }
    } else {
      console.error(" Dados inválidos recebidos:", result);
      showError("Formato de dados inválido");
    }
  } catch (error) {
    console.error(" Erro ao carregar dados:", error);
    showError(`Falha ao carregar dados: ${error.message}`);
  }
}

// Atualizar dashboard
function updateDashboard(data) {
  // KPIs
  document.getElementById("totalProducts").textContent =
    data.length.toLocaleString("pt-BR");

  const avgPrice =
    data.reduce((sum, item) => sum + parseFloat(item.price_current || 0), 0) /
    data.length;
  document.getElementById("avgPrice").textContent =
    `R$ ${avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const platforms = [...new Set(data.map((item) => item.platform))];
  document.getElementById("totalPlatforms").textContent = platforms.length;

  const categories = [...new Set(data.map((item) => item.category))];
  document.getElementById("totalCategories").textContent = categories.length;

  // Gráficos
  updatePlatformChart(data);
  updateCategoryChart(data);
  updateRankingChart(data);
}

// Gráfico de Platforms
function updatePlatformChart(data) {
  const platformCounts = {};
  data.forEach((item) => {
    platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
  });

  const ctx = document.getElementById("platformChart").getContext("2d");
  if (platformChart) platformChart.destroy();

  platformChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(platformCounts),
      datasets: [
        {
          data: Object.values(platformCounts),
          backgroundColor: ["#ffe600", "#ff9900"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

// Gráfico de Categorias
function updateCategoryChart(data) {
  const categoryCounts = {};
  data.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  let sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a,
  );

  // Aplicar filtro de quantidade
  if (currentChartFilters.category === "top5") {
    sortedCategories = sortedCategories.slice(0, 5);
  } else if (currentChartFilters.category === "top10") {
    sortedCategories = sortedCategories.slice(0, 10);
  }
  // 'all' não aplica limite

  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();

  // Mudar para pizza se tiver muitas categorias
  const chartType = sortedCategories.length > 8 ? "pie" : "bar";

  categoryChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: sortedCategories.map(([cat]) => cat),
      datasets: [
        {
          label: "Quantidade",
          data: sortedCategories.map(([, count]) => count),
          backgroundColor:
            chartType === "pie"
              ? [
                  "#ff6384",
                  "#36a2eb",
                  "#ffce56",
                  "#4bc0c0",
                  "#9966ff",
                  "#ff9f40",
                  "#ff6384",
                  "#c9cbcf",
                  "#4bc0c0",
                  "#ff6384",
                  "#36a2eb",
                  "#ffce56",
                  "#4bc0c0",
                  "#9966ff",
                  "#ff9f40",
                ]
              : "#3b82f6",
          borderColor: chartType === "pie" ? "#fff" : "#1d4ed8",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales:
        chartType === "bar"
          ? {
              y: { beginAtZero: true },
            }
          : {},
      plugins: {
        legend:
          chartType === "pie"
            ? {
                position: "right",
                labels: {
                  boxWidth: 12,
                  padding: 10,
                  font: { size: 11 },
                },
              }
            : { display: false },
      },
    },
  });
}

// Gráfico de Evolução de Ranking
function updateRankingChart(data) {
  // Agrupar produtos por nome e coletar evolução de ranking
  const productEvolution = {};

  data.forEach((item) => {
    const productName = item.name || "";
    if (productName) {
      if (!productEvolution[productName]) {
        productEvolution[productName] = {
          rankings: [],
          dates: [],
          platform: item.platform,
          category: item.category,
        };
      }
      productEvolution[productName].rankings.push(
        parseInt(item.ranking) || 999,
      );
      productEvolution[productName].dates.push(item.data);
    }
  });

  // Filtrar produtos com múltiplas aparições
  const multiAppearanceProducts = Object.entries(productEvolution)
    .filter(([, evolution]) => evolution.rankings.length > 1)
    .map(([name, evolution]) => ({
      name,
      ...evolution,
    }));

  // Ordenar por frequência de aparição
  multiAppearanceProducts.sort((a, b) => b.rankings.length - a.rankings.length);

  // Aplicar filtro de quantidade
  let displayProducts = multiAppearanceProducts;
  if (currentChartFilters.ranking === "top5") {
    displayProducts = multiAppearanceProducts.slice(0, 5);
  } else if (currentChartFilters.ranking === "top10") {
    displayProducts = multiAppearanceProducts.slice(0, 10);
  }

  // Preparar datasets para o gráfico de linhas
  const datasets = displayProducts.map((product, index) => {
    const colors = [
      "#d4ff3f",
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#f9ca24",
      "#6c5ce7",
      "#a29bfe",
      "#fd79a8",
      "#fdcb6e",
      "#e17055",
    ];

    // Ordenar por data
    const sortedData = product.dates
      .map((date, i) => ({
        x: date,
        y: product.rankings[i],
      }))
      .sort(
        (a, b) =>
          new Date(a.x.split("/").reverse().join("-")) -
          new Date(b.x.split("/").reverse().join("-")),
      );

    return {
      label:
        product.name.length > 25
          ? product.name.substring(0, 22) + "..."
          : product.name,
      data: sortedData,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + "20",
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  const ctx = document.getElementById("rankingChart").getContext("2d");
  if (rankingChart) rankingChart.destroy();

  rankingChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            padding: 10,
            font: { size: 11 },
            color: "#ffffff",
          },
        },
        tooltip: {
          backgroundColor: "#1a1a1a",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#d4ff3f",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: Ranking #${context.parsed.y}`;
            },
          },
        },
        title: {
          display: true,
          text: "Evolução de Ranking (linha para baixo = melhora)",
          color: "#ffffff",
          font: { size: 12 },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Data",
            color: "#ffffff",
          },
          ticks: {
            color: "#ffffff",
          },
          grid: {
            color: "#ffffff10",
          },
        },
        y: {
          reverse: true, // Ranking 1 é o melhor (topo)
          title: {
            display: true,
            text: "Ranking",
            color: "#ffffff",
          },
          ticks: {
            color: "#ffffff",
          },
          grid: {
            color: "#ffffff10",
          },
        },
      },
    },
  });
}

// Carregar categorias para filtros
async function populateFilters() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const categories = Array.isArray(result) ? result : result.data || [];
    const categoryFilter = document.getElementById("categoryFilter");

    // Limpar opções existentes (exceto "Todas")
    while (categoryFilter.children.length > 1) {
      categoryFilter.removeChild(categoryFilter.lastChild);
    }

    // Adicionar categorias
    if (Array.isArray(categories)) {
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

// Carregar oportunidades de preço
async function loadOpportunities() {
  try {
    console.log("Carregando oportunidades de preço...");

    const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const opportunities = Array.isArray(result) ? result : result.data || [];
    opportunitiesData = opportunities;
    console.log("Oportunidades encontradas:", opportunitiesData.length);

    displayOpportunities(opportunitiesData);
  } catch (error) {
    console.error("Erro ao carregar oportunidades:", error);
    showError(`Falha ao carregar oportunidades: ${error.message}`);
  }
}

// Carregar pódio dos 5 produtos com maior frequência por plataforma
async function loadPodium() {
  try {
    console.log("Carregando pódio de produtos...");

    // Usar os dados já carregados em currentData
    if (!currentData || currentData.length === 0) {
      console.log("Nenhum dado disponível para o pódio");
      return;
    }

    // Separar produtos por plataforma
    const mlProducts = {};
    const amazonProducts = {};

    currentData.forEach((item) => {
      const productName = item.name;
      const isML = item.platform.toLowerCase().includes("mercado");
      const productMap = isML ? mlProducts : amazonProducts;

      if (productMap[productName]) {
        productMap[productName].count++;
        // Atualizar informações mais recentes
        if (item.scraped_at > productMap[productName].lastSeen) {
          productMap[productName].lastSeen = item.scraped_at;
          productMap[productName].platform = item.platform;
          productMap[productName].category = item.category;
          productMap[productName].ranking = item.ranking;
          productMap[productName].url = item.url;
        }
      } else {
        productMap[productName] = {
          count: 1,
          name: productName,
          platform: item.platform,
          category: item.category,
          ranking: item.ranking,
          url: item.url,
          lastSeen: item.scraped_at,
        };
      }
    });

    // Ordenar por frequência e pegar os top 5 de cada plataforma
    const topML = Object.values(mlProducts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topAmazon = Object.values(amazonProducts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    console.log("Top 5 ML:", topML);
    console.log("Top 5 Amazon:", topAmazon);

    displayPlatformPodium("ml", topML);
    displayPlatformPodium("amazon", topAmazon);
  } catch (error) {
    console.error("Erro ao carregar pódio:", error);
    document.getElementById("mlPodiumContainer").innerHTML = `
      <div class="text-center text-red-400 py-6">
        <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
        <p class="text-sm">Erro ao carregar pódio ML</p>
      </div>
    `;
    document.getElementById("amazonPodiumContainer").innerHTML = `
      <div class="text-center text-red-400 py-6">
        <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
        <p class="text-sm">Erro ao carregar pódio Amazon</p>
      </div>
    `;
  }
}

// Exibir pódio dos produtos por plataforma
function displayPlatformPodium(platform, topProducts) {
  const containerId =
    platform === "ml" ? "mlPodiumContainer" : "amazonPodiumContainer";
  const container = document.getElementById(containerId);

  if (!topProducts || topProducts.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-400 py-6">
        <i class="fas fa-trophy text-xl mb-2"></i>
        <p class="text-sm">Nenhum produto encontrado</p>
      </div>
    `;
    return;
  }

  const positionClasses = ["gold", "silver", "bronze", "other", "other"];
  const positionIcons = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const linkClass = platform === "ml" ? "ml-link" : "amazon-link";
  const itemClass = platform === "ml" ? "ml" : "amazon";

  container.innerHTML = topProducts
    .map((product, index) => {
      const positionClass = positionClasses[index];
      const positionIcon = positionIcons[index];

      return `
      <div class="podium-item podium-item-platform ${itemClass}" onclick="window.open('${product.url}', '_blank')">
        <div class="podium-position ${positionClass}">
          ${positionIcon}
        </div>
        <div class="podium-info">
          <div class="podium-name">${product.name}</div>
          <div class="podium-details">
            <div class="podium-frequency">
              <i class="fas fa-chart-line mr-1"></i>
              ${product.count} aparições
            </div>
            <div class="podium-category text-xs">
              <i class="fas fa-tag mr-1"></i>
              ${product.category}
            </div>
            <div class="text-xs">
              <i class="fas fa-trophy mr-1"></i>
              Ranking #${product.ranking}
            </div>
            <div class="mt-2">
              <a href="${product.url}" target="_blank" class="podium-link ${linkClass}" onclick="event.stopPropagation()">
                <i class="fas fa-external-link-alt mr-1"></i>
                Ver Produto
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// Exibir oportunidades de preço
function displayOpportunities(opportunities) {
  const container = document.getElementById("opportunitiesContainer");
  const noOpportunities = document.getElementById("noOpportunities");

  // Validar se opportunities é um array
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    container.innerHTML = "";
    noOpportunities.classList.remove("hidden");
    return;
  }

  noOpportunities.classList.add("hidden");

  container.innerHTML = opportunities
    .map(
      (opp) => `
        <div class="opportunity-card bg-[#0f0f0f] border border-white/10 rounded-lg p-4 hover:border-[#d4ff3f]/30 transition-all">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h4 class="font-semibold text-white text-sm mb-1 line-clamp-2">${opp.name}</h4>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="platform-badge ${opp.platform.toLowerCase().includes("mercado") ? "ml-badge" : "amazon-badge"}">
                            ${opp.platform}
                        </span>
                        <span class="text-xs text-gray-400">${opp.category}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400 mb-1">Ranking</div>
                    <div class="text-lg font-bold text-[#d4ff3f]">#${opp.ranking}</div>
                </div>
            </div>
            
            <div class="flex justify-between items-center mb-3">
                <div>
                    <div class="text-xs text-gray-400">Preço Anterior</div>
                    <div class="text-sm font-medium text-gray-400 line-through">R$ ${parseFloat(opp.preco_anterior).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div class="text-xs text-gray-400">Preço Atual</div>
                    <div class="text-lg font-bold text-white">R$ ${parseFloat(opp.preco_novo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400">Queda de Preço</div>
                    <div class="text-sm font-semibold text-green-400">
                        -${Math.abs(parseFloat(opp.porcentagem_queda)).toFixed(1)}%
                    </div>
                    <div class="text-xs text-green-400 mt-1">
                        Economia: R$ ${(parseFloat(opp.preco_anterior) - parseFloat(opp.preco_novo)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>
            
            <div class="flex justify-between items-center">
                <div class="text-xs text-gray-400">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${new Date(opp.scraped_at).toLocaleDateString("pt-BR")}
                </div>
                <a href="${opp.url}" target="_blank" rel="noopener"
                   class="text-xs text-[#d4ff3f] hover:text-white transition">
                    Ver Produto <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        </div>
    `,
    )
    .join("");
}

// Atualizar tabela de dados
function updateTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.slice(0, 50).forEach((item) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-[#2a2a2a] transition-colors";
    row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <span class="platform-badge ${item.platform.toLowerCase().includes("mercado") ? "ml-badge" : "amazon-badge"}">
                    ${item.platform}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" title="${item.name}">
                ${item.name}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                ${item.category}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                #${item.ranking}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                R$ ${parseFloat(item.price_current).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                ${item.data}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <a href="${item.url}" target="_blank" 
                   class="text-[#d4ff3f] hover:text-white transition">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Event Listeners
function setupEventListeners() {
  // Filtros
  document
    .getElementById("applyFilters")
    .addEventListener("click", applyFilters);
  document
    .getElementById("clearFilters")
    .addEventListener("click", clearFilters);
  document
    .getElementById("todayFilter")
    .addEventListener("click", setTodayFilter);

  // Refresh
  document.getElementById("refreshBtn").addEventListener("click", loadData);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document
    .getElementById("refreshOpportunities")
    .addEventListener("click", loadOpportunities);

  // Filtros dos Gráficos - Platform
  document.getElementById("platformChartAll").addEventListener("click", () => {
    updateChartFilter("platform", "all", "platformChart");
  });
  document.getElementById("platformChartML").addEventListener("click", () => {
    updateChartFilter("platform", "ml", "platformChart");
  });
  document.getElementById("platformChartAZ").addEventListener("click", () => {
    updateChartFilter("platform", "amazon", "platformChart");
  });

  // Filtros dos Gráficos - Categoria
  document
    .getElementById("categoryChartTop10")
    .addEventListener("click", () => {
      updateChartFilter("category", "top10", "categoryChart");
    });
  document.getElementById("categoryChartTop5").addEventListener("click", () => {
    updateChartFilter("category", "top5", "categoryChart");
  });
  document.getElementById("categoryChartAll").addEventListener("click", () => {
    updateChartFilter("category", "all", "categoryChart");
  });

  // Filtros dos Gráficos - Ranking
  document.getElementById("rankingChartTop5").addEventListener("click", () => {
    updateChartFilter("ranking", "top5", "rankingChart");
  });
  document.getElementById("rankingChartTop10").addEventListener("click", () => {
    updateChartFilter("ranking", "top10", "rankingChart");
  });
}

// Atualizar filtros dos gráficos
function updateChartFilter(chartType, filterValue, buttonId) {
  currentChartFilters[chartType] = filterValue;

  // Atualizar estilo dos botões
  const buttons = document.querySelectorAll(`[id^="${buttonId}"]`);
  buttons.forEach((btn) => {
    btn.classList.remove("bg-[#d4ff3f]", "text-black");
    btn.classList.add(
      "bg-[#1a1a1a]",
      "border",
      "border-white/10",
      "text-gray-400",
    );
  });

  const activeBtn = document.getElementById(
    buttonId + filterValue.charAt(0).toUpperCase() + filterValue.slice(1),
  );
  if (activeBtn) {
    activeBtn.classList.remove(
      "bg-[#1a1a1a]",
      "border",
      "border-white/10",
      "text-gray-400",
    );
    activeBtn.classList.add("bg-[#d4ff3f]", "text-black");
  }

  // Atualizar gráficos com dados filtrados
  updateChartsWithFilters();
}

// Atualizar gráficos com filtros
function updateChartsWithFilters() {
  let filteredData = [...currentData];

  // Aplicar filtro de platform
  if (currentChartFilters.platform === "ml") {
    filteredData = filteredData.filter(
      (item) => item.platform === "Mercado Livre",
    );
  } else if (currentChartFilters.platform === "amazon") {
    filteredData = filteredData.filter((item) => item.platform === "Amazon");
  }

  // Atualizar gráficos
  updatePlatformChart(filteredData);
  updateCategoryChart(filteredData);
  updateRankingChart(filteredData);
}

// Definir filtro para hoje
function setTodayFilter() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  document.getElementById("dateFrom").value = formattedDate;
  document.getElementById("dateTo").value = formattedDate;

  console.log("Data de hoje definida:", formattedDate);
  console.log("Data de hoje em ISO:", convertToISODate(formattedDate));
  applyFilters();
}

// Função para converter data dd/MM/yyyy para formato ISO (para scraped_at)
function convertToISODate(dateString) {
  if (
    !dateString ||
    typeof dateString !== "string" ||
    !dateString.includes("/")
  ) {
    return null;
  }

  // Divide "26/04/2026" em [26, 04, 2026]
  const parts = dateString.trim().split("/");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  // Retorna apenas "2026-04-26" (o backend cuidará do resto)
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Aplicar filtros
async function applyFilters() {
  try {
    console.log("Aplicando filtros com dados completos...");

    const platform = document.getElementById("platformFilter").value;
    const category = document.getElementById("categoryFilter").value;
    const dateFrom = document.getElementById("dateFrom").value;
    const dateTo = document.getElementById("dateTo").value;

    // Converter datas para formato ISO (para scraped_at)
    const isoDateFrom = convertToISODate(dateFrom);
    const isoDateTo = convertToISODate(dateTo);

    console.log("Filtros selecionados:", {
      platform,
      category,
      dateFrom: dateFrom,
      dateTo: dateTo,
      isoDateFrom,
      isoDateTo,
    });

    // Construir query params
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (category) params.append("category", category);
    if (isoDateFrom) params.append("date_from", isoDateFrom);
    if (isoDateTo) params.append("date_to", isoDateTo);

    const fullUrl = `${API_BASE_URL}/api/analytics-full?${params}`;
    console.log("URL completa:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Status da resposta:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro HTTP:", response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // NOVO: Proteção para não quebrar o dashboard se a busca falhar
    if (!result || result.error) {
      console.error("Erro nos filtros:", result?.error);
      showError(result?.error || "Erro ao aplicar filtros");
      return;
    }

    const filteredData = result.data || [];

    console.log("Resposta da API:", result);
    console.log("Dados filtrados completos:", filteredData.length, "produtos");
    console.log(
      "Total real na tabela com filtros:",
      result.total || "desconhecido",
    );

    updateTable(filteredData);
    updateDashboard(filteredData);

    // Mostrar feedback visual com estatísticas reais
    if (filteredData.length === 0) {
      showError("Nenhum produto encontrado para os filtros selecionados");
    } else {
      console.log("Filtros aplicados com sucesso!");
      if (result.total && result.total > 100) {
        console.log(
          ` Análise completa com filtros: ${filteredData.length} produtos de ${result.total} totais`,
        );
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar filtros:", error);
    showError(`Falha ao aplicar filtros: ${error.message}`);
  }
}

// Limpar filtros
function clearFilters() {
  document.getElementById("platformFilter").value = "";
  document.getElementById("categoryFilter").value = "";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  updateTable(currentData);
  updateDashboard(currentData);
}

// Exportar dados
function exportData() {
  const csv = [
    ["Platform", "Produto", "Categoria", "Ranking", "Preço", "Data", "URL"],
    ...currentData.map((item) => [
      item.platform,
      item.name,
      item.category,
      item.ranking,
      item.price_current,
      item.data,
      item.url,
    ]),
  ]
    .map((row) => row.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trend_hunter_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

// Error handling
function showError(message) {
  const div = document.createElement("div");
  div.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
  div.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

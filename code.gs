function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('FLOW - Escalonamento de Filas SETIC TRT-13')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDados() {
  var userProperties = PropertiesService.getScriptProperties();
  var customData = userProperties.getProperty('CUSTOM_DADOS');
  var customLogo = userProperties.getProperty('CUSTOM_LOGO') || "";
  
  var dados = customData ? JSON.parse(customData) : getDadosPadrao();
  var listaFinal = [];

  dados.forEach(function(bloco, bIdx) {
    if (bloco.sistema) {
      listaFinal.push(bloco);
    } else if (bloco.sistemas) {
      bloco.sistemas.forEach(function(sys, sIdx) {
        var fluxoCompleto = [
          { nivel: "1º Nível", fila: "Fila Central de Serviço", resp: "Atendimento Inicial" }
        ];
        var fluxoEspecifico = sys.fluxo || bloco.fluxo || [];
        fluxoCompleto = fluxoCompleto.concat(fluxoEspecifico);

        listaFinal.push({
          id: bIdx + "_" + sIdx,
          sistema: sys.nome,
          descricao: sys.desc,
          url: sys.url,
          acesso: sys.acesso,
          fluxo: fluxoCompleto,
          obs: sys.obs || bloco.obs || ""
        });
      });
    }
  });

  return { itens: listaFinal, logo: customLogo };
}

function salvarDados(novaLista) {
  var userProperties = PropertiesService.getScriptProperties();
  userProperties.setProperty('CUSTOM_DADOS', JSON.stringify(novaLista));
  return true;
}

function salvarLogoServer(base64Image) {
  var userProperties = PropertiesService.getScriptProperties();
  userProperties.setProperty('CUSTOM_LOGO', base64Image);
  return true;
}

function autenticarAdmin(usuario, senhaDigitada) {
  var props = PropertiesService.getScriptProperties();
  var senhaSalva = props.getProperty('SENHA_ADMIN') || 'admin12345678';
  return { sucesso: (usuario === 'admin' && senhaDigitada === senhaSalva) };
}

function alterarSenhaAdmin(senhaAtual, novaSenha) {
  var props = PropertiesService.getScriptProperties();
  var senhaSalva = props.getProperty('SENHA_ADMIN') || 'admin12345678';
  if (senhaAtual !== senhaSalva) {
    return { sucesso: false, mensagem: 'A senha atual informada está incorreta.' };
  }
  props.setProperty('SENHA_ADMIN', novaSenha);
  return { sucesso: true, mensagem: 'Senha de Administrador alterada com sucesso!' };
}

function getDadosPadrao() {
  return [
    {
      sistemas: [
        { nome: "Aud", desc: "Sistema de audiências da Justiça do Trabalho (Sistema Satélite do PJe)", url: "https://pje.trt13.jus.br/aud/", acesso: "Só gestores" },
        { nome: "Audiência Digital", desc: "Sistema para envio das mídias de audiências para o PJe Mídias", url: "", acesso: "Só gestores" },
        { nome: "Ccalc", desc: "Sistema para distribuição dos cálculos dos processos para os calculistas.", url: "", acesso: "Só gestores" },
        { nome: "Central de Mandados", desc: "Módulo do PJe para distribuição dos mandados.", url: "", acesso: "Só gestores" },
        { nome: "eCartas", desc: "Integração do PJe com os correios.", url: "", acesso: "Só gestores" },
        { nome: "GPrec", desc: "Sistema de Gestão de Precatórios e RPV (Sistema Satélite do PJe)", url: "https://pje.trt13.jus.br/gprec/", acesso: "Só gestores" },
        { nome: "PJe 1º Grau", desc: "Sistema de Processos Judiciais Eletrônicos da JT", url: "https://pje.trt13.jus.br/primeirograu/", acesso: "Só gestores" },
        { nome: "PJe-Calc", desc: "Módulo do PJe que realiza os cálculos dos processos.", url: "https://pje.trt13.jus.br/pjecalc/", acesso: "Só gestores" },
        { nome: "PJe Mídias", desc: "Armazena vídeos de audiências e sessões", url: "https://midias.pje.jus.br/midias/web/site/login", acesso: "Só gestores" }
      ],
      fluxo: [
        { nivel: "2º Nível", fila: "Fila PJe 2º Nível", resp: "Emília, Iuri, Marcos Everton" },
        { nivel: "3º Nível", fila: "Squad - PJe", resp: "Felipe Barbosa, Washington, Frederico Pereira" }
      ]
    }
  ];
}
